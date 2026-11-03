import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CourseChoiceForm from "@/components/placement/CourseChoiceForm";
import MyCourses from "@/components/placement/MyCourses";
import PlacementGate from "@/components/placement/PlacementGate";
import type { PlacementChoice } from "@/lib/placement";

const f = vi.hoisted(() => ({
  me: { data: undefined as unknown, isError: false, isFetching: false, refetch: vi.fn() },
  options: { data: undefined as unknown, isError: false, isFetching: false, refetch: vi.fn() },
  mutate: vi.fn(),
  optionsEnabled: [] as boolean[],
  saving: false,
  error: null as unknown,
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: "one" } }),
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/lib/api-config", () => ({
  apiClient: {
    useQuery: ({ url, options }: { url: string; options?: { enabled?: boolean } }) => {
      if (url.endsWith("/options")) {
        f.optionsEnabled.push(options?.enabled === true);
        return f.options;
      }
      return f.me;
    },
    useMutation: () => ({
      mutate: f.mutate,
      isPending: f.saving,
      isError: !!f.error,
      error: f.error,
    }),
  },
}));

const choice = (key: string, course: string, name: string): PlacementChoice => ({
  batch_key: key,
  batch_name: name,
  course_id: course,
  course_name: course === "7" ? "Full Stack Development" : "Data Analytics",
  label: `${course === "7" ? "Full Stack Development" : "Data Analytics"} · ${name}`,
});
const OPEN = {
  items: [
    choice("fs-2026", "7", "Batch 2026"),
    choice("fs-2025", "7", "Batch 2025"),
    choice("da-2025", "8", "Batch 2025"),
  ],
  stale: false,
};
const NEEDS = { needs_placement: true, college: "City College", selected: [] };
const PLACED = {
  needs_placement: false,
  college: null,
  selected: [{ ...choice("fs-2026", "7", "Batch 2026"), selected_at: "2026-11-03T10:00:00Z" }],
};

beforeEach(() => {
  f.me = { data: undefined, isError: false, isFetching: false, refetch: vi.fn() };
  f.options = { data: undefined, isError: false, isFetching: false, refetch: vi.fn() };
  f.mutate = vi.fn();
  f.optionsEnabled = [];
  f.saving = false;
  f.error = null;
  sessionStorage.clear();
});

describe("CourseChoiceForm", () => {
  it("lets a learner take several courses but only one batch of each", () => {
    const onSubmit = vi.fn();
    render(
      <CourseChoiceForm
        items={OPEN.items}
        initial={[]}
        saving={false}
        error={null}
        submitLabel="Save my courses"
        onSubmit={onSubmit}
      />
    );
    const save = screen.getByRole("button", { name: "Save my courses" });
    expect(save).toBeDisabled();
    const fullStack = screen.getByRole("group", { name: "Full Stack Development" });
    const [batch2026, batch2025] = fullStack.querySelectorAll("input");
    fireEvent.click(batch2026);
    fireEvent.click(batch2025); // replaces 2026
    fireEvent.click(screen.getByRole("group", { name: "Data Analytics" }).querySelector("input")!);
    expect((batch2026 as HTMLInputElement).checked).toBe(false);
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledWith(["fs-2025", "da-2025"]);
  });

  it("shows why a save failed and does not hide the form", () => {
    render(
      <CourseChoiceForm
        items={OPEN.items}
        initial={["fs-2026"]}
        saving={false}
        error="One of those courses is not open for choosing."
        submitLabel="Save"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("not open for choosing");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

describe("PlacementGate", () => {
  it("asks a learner who has not chosen yet, and saves their choice", () => {
    f.me.data = NEEDS;
    f.options.data = OPEN;
    render(<PlacementGate />);
    expect(
      screen.getByRole("dialog", { name: "Which course and batch are you in?" })
    ).toBeVisible();
    expect(screen.getByText(/Your college: City College/)).toBeVisible();
    fireEvent.click(screen.getByLabelText("Batch 2026"));
    fireEvent.click(screen.getByRole("button", { name: "Save my courses" }));
    expect(f.mutate).toHaveBeenCalledWith({ batch_keys: ["fs-2026"] }, expect.anything());
  });

  it("asks nothing of a learner who is already placed, and never loads the list for them", () => {
    f.me.data = PLACED;
    render(<PlacementGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(f.optionsEnabled.every((enabled) => !enabled)).toBe(true);
  });

  it("stays out of the way when the list cannot load or nothing is open yet", () => {
    f.me.data = NEEDS;
    f.options.isError = true;
    const { rerender } = render(<PlacementGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
    f.options.isError = false;
    f.options.data = { items: [], stale: false };
    rerender(<PlacementGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not guess when the answer is malformed", () => {
    f.me.data = { needs_placement: "maybe" };
    render(<PlacementGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hides stale data while it reloads", () => {
    f.me.data = NEEDS;
    f.me.isFetching = true;
    f.options.data = OPEN;
    render(<PlacementGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("'Not now' closes it for this visit", () => {
    f.me.data = NEEDS;
    f.options.data = OPEN;
    const { unmount } = render(<PlacementGate />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    render(<PlacementGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the server's reason when saving fails", () => {
    f.me.data = NEEDS;
    f.options.data = OPEN;
    f.error = { response: { data: { detail: "Choose only one batch for each course." } } };
    render(<PlacementGate />);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose only one batch for each course.");
  });
});

describe("MyCourses on the profile page", () => {
  it("says loading, then lists what was chosen", () => {
    const { rerender } = render(<MyCourses />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your courses");
    f.me.data = PLACED;
    rerender(<MyCourses />);
    expect(screen.getByText("Full Stack Development · Batch 2026")).toBeVisible();
    expect(screen.getByRole("button", { name: "Change my courses" })).toBeVisible();
  });

  it("does not show a stale choice when loading fails", () => {
    f.me.data = PLACED;
    f.me.isError = true;
    render(<MyCourses />);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.queryByText("Full Stack Development · Batch 2026")).toBeNull();
  });

  it("tells someone placed by their program team that, instead of asking them to choose", () => {
    f.me.data = { needs_placement: false, college: null, selected: [] };
    render(<MyCourses />);
    expect(screen.getByText(/set by your program team/)).toBeVisible();
  });

  it("lets a learner change a choice, keeping a batch the program team has since closed", () => {
    f.me.data = PLACED;
    f.options.data = { items: [choice("da-2025", "8", "Batch 2025")], stale: false }; // fs-2026 closed
    render(<MyCourses />);
    fireEvent.click(screen.getByRole("button", { name: "Change my courses" }));
    expect((screen.getByLabelText("Batch 2026") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText("Batch 2025"));
    fireEvent.click(screen.getByRole("button", { name: "Save my courses" }));
    expect(f.mutate).toHaveBeenCalledWith(
      { batch_keys: ["fs-2026", "da-2025"] },
      expect.anything()
    );
  });

  it("explains an unreachable list without losing the current choice", () => {
    f.me.data = PLACED;
    f.options.isError = true;
    render(<MyCourses />);
    fireEvent.click(screen.getByRole("button", { name: "Change my courses" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Your choice was not changed");
  });
});
