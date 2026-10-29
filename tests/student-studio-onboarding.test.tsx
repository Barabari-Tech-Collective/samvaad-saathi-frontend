import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render as renderBase, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Onboarding from "@/app/(protected)/onboarding/page";
import { DEGREE_OPTIONS, UNIVERSITY_OPTIONS, ROLE_OPTIONS } from "@/lib/constants";
vi.mock("@/lib/resume-storage-recovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/resume-storage-recovery")>();
  return { ...actual, prepareResumeUpload: vi.fn().mockResolvedValue("a".repeat(64)) };
});
const fixture = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn(), header: "" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fixture.push }) }));
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: React.ComponentProps<"img">) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));
vi.mock("@/lib/api-config", () => ({
  ENDPOINTS: {
    USERS: { PROFILE: "profile" },
    RESUME: { EXTRACT: "extract" },
    AUTH: { ABOUT_ME: "about" },
  },
  extractApiErrorMessage: () => "Request failed",
  createApiClient: () => ({
    useQuery: () => ({ data: { items: [] }, isLoading: false }),
    useMutation: (options: { url: string; config?: { headers?: Record<string, string> } }) => ({
      isPending: false,
      mutateAsync: (data: unknown) => {
        if (options.url === "extract")
          fixture.header = options.config?.headers?.["Idempotency-Key"] || "";
        return fixture.save(data);
      },
    }),
  }),
}));
vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({ useMutation: () => ({ isPending: false, mutateAsync: fixture.save }) }),
}));
beforeEach(() => {
  fixture.save.mockReset();
  fixture.push.mockReset();
});
function education() {
  fireEvent.change(screen.getByRole("combobox", { name: "Degree" }), {
    target: { value: DEGREE_OPTIONS[0] },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "University" }), {
    target: { value: UNIVERSITY_OPTIONS.find((x) => x !== "Others") },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue to career details" }));
}
function career() {
  fireEvent.change(screen.getByRole("combobox", { name: "Target Position / Role" }), {
    target: { value: ROLE_OPTIONS[0] },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Years of Experience" }), {
    target: { value: "0" },
  });
}
it("retains both steps when the learner goes back to correct education", () => {
  render(<Onboarding />);
  education();
  career();
  fireEvent.click(screen.getByRole("button", { name: "Back to education" }));
  expect(screen.getByRole("combobox", { name: "Degree" })).toHaveValue(DEGREE_OPTIONS[0]);
  fireEvent.click(screen.getByRole("button", { name: "Continue to career details" }));
  expect(screen.getByRole("combobox", { name: "Target Position / Role" })).toHaveValue(
    ROLE_OPTIONS[0]
  );
  expect(screen.getByRole("combobox", { name: "Years of Experience" })).toHaveValue("0");
});
it("blocks duplicate saves and back navigation while onboarding submission is in flight", async () => {
  let finish: () => void = () => {};
  fixture.save.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    })
  );
  render(<Onboarding />);
  education();
  career();
  fireEvent.click(screen.getByRole("button", { name: "Open my studio" }));
  expect(screen.getByRole("button", { name: /Creating Profile/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Back to education" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /Creating Profile/ }));
  expect(fixture.save).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.getByRole("button", { name: "Open my studio" })).toBeEnabled();
});

it("does not poll or advance onboarding after the account changes during upload", async () => {
  let finish!: () => void;
  fixture.save.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    })
  );
  const { container } = render(<Onboarding />);
  education();
  career();
  const input = container.querySelector('input[type="file"]')!;
  fireEvent.change(input, {
    target: { files: [new File(["pdf"], "cv.pdf", { type: "application/pdf" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open my studio" }));
  await waitFor(() => expect(fixture.save).toHaveBeenCalledTimes(1));
  document.cookie = "token=changed-account; path=/";
  await act(async () => finish());
  expect(fixture.save).toHaveBeenCalledTimes(1);
  expect(fixture.push).not.toHaveBeenCalled();
  document.cookie = "token=; max-age=0; path=/";
});

it("keeps the file and stops onboarding when the server does not save resume data", async () => {
  fixture.save.mockResolvedValue({ saved: false, textLength: 100 });
  const { container } = render(<Onboarding />);
  education();
  career();
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["pdf"], "cv.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Open my studio" }));
  await act(async () => {});
  expect(fixture.save).toHaveBeenCalledTimes(1);
  expect(fixture.push).not.toHaveBeenCalled();
  expect(input.files?.[0]).toBe(file);
});
it("advances from the exact upload receipt without polling an old hasResume flag", async () => {
  fixture.save.mockResolvedValueOnce({ saved: true, textLength: 100 }).mockResolvedValueOnce({});
  const { container } = render(<Onboarding />);
  education();
  career();
  fireEvent.change(container.querySelector('input[type="file"]')!, {
    target: { files: [new File(["pdf"], "cv.pdf", { type: "application/pdf" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open my studio" }));
  await act(async () => {});
  expect(fixture.save).toHaveBeenCalledTimes(2);
  expect(fixture.header).toMatch(/^[a-f0-9-]{36}$/);
  expect(fixture.save.mock.calls[1][0]).toMatchObject({ years_experience: "0" });
  // Retry the later profile step while the confirmed file remains selected.
  fireEvent.click(screen.getByRole("button", { name: "Open my studio" }));
  await act(async () => {});
  expect(fixture.save).toHaveBeenCalledTimes(3);
  expect(fixture.save.mock.calls[2][0]).toEqual(fixture.save.mock.calls[1][0]);
});

function render(ui: React.ReactNode) { return renderBase(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>); }
