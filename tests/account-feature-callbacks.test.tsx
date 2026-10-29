import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HumanInterviews } from "@/components/human-interviews/HumanInterviews";
import InterviewCompleted from "@/app/(protected)/interview-completed/page";
const f = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), replace: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/api-config", () => ({
  apiClient: {
    get: f.get,
    useQuery: () => ({
      data: {
        items: [
          {
            id: 1,
            title: "Interview",
            status: "scheduled",
            can_join: true,
            starts_at: "2026-10-22",
            ends_at: "2099-10-22",
            join_opens_at: "2026-10-22",
          },
        ],
        total: 1,
      },
      isFetching: false,
      isError: false,
    }),
  },
}));
vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({ get: f.get, useMutation: () => ({ mutateAsync: f.post }) }),
}));
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: 1 }, loading: false }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: f.replace }),
  useSearchParams: () => new URLSearchParams("interviewId=1"),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({ trackEvent: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[0] === "completion-status"
      ? { data: { status: "completed", interviewMode: "practice" }, isFetching: false }
      : {
          isError: true,
          error: { response: { status: 404 } },
          isFetching: false,
          refetch: f.refetch,
        },
}));
function login(name: string) {
  document.cookie = `token=x.${btoa(JSON.stringify({ email: name }))}.x; path=/`;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  login("first");
});
afterEach(() => {
  document.cookie = "token=; max-age=0; path=/";
});
it("blocks a meeting-access request from the old page before remount", () => {
  render(<HumanInterviews accountKey="first" />);
  login("second");
  fireEvent.click(screen.getByRole("button", { name: "Check meeting access" }));
  expect(f.get).not.toHaveBeenCalled();
});
it.each(["success", "failure"])(
  "ignores delayed meeting %s after account switch",
  async (outcome) => {
    const pending = deferred<{ url: string }>();
    f.get.mockReturnValue(pending.promise);
    render(<HumanInterviews accountKey="first" />);
    fireEvent.click(screen.getByRole("button", { name: "Check meeting access" }));
    login("second");
    await act(async () => {
      if (outcome === "success") pending.resolve({ url: "https://meet.google.com/abc-defg-hij" });
      else pending.reject(new Error("offline"));
    });
    expect(screen.queryByRole("link", { name: /Open Google Meet/ })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  }
);
it("blocks a previously verified meeting link after account switch", async () => {
  f.get.mockResolvedValue({ url: "https://meet.google.com/abc-defg-hij" });
  render(<HumanInterviews accountKey="first" />);
  fireEvent.click(screen.getByRole("button", { name: "Check meeting access" }));
  const link = await screen.findByRole("link", { name: /Open Google Meet/ });
  login("second");
  expect(fireEvent.click(link)).toBe(false);
  expect(screen.queryByRole("link", { name: /Open Google Meet/ })).toBeNull();
});
it("blocks feedback preparation from an old page", () => {
  render(<InterviewCompleted />);
  login("second");
  fireEvent.click(screen.getByRole("button", { name: "Prepare feedback" }));
  expect(f.post).not.toHaveBeenCalled();
});
it.each(["success", "failure"])(
  "ignores delayed feedback %s after account switch",
  async (outcome) => {
    const pending = deferred<unknown>();
    f.post.mockReturnValue(pending.promise);
    render(<InterviewCompleted />);
    fireEvent.click(screen.getByRole("button", { name: "Prepare feedback" }));
    login("second");
    await act(async () => {
      if (outcome === "success") pending.resolve({});
      else pending.reject(new Error("offline"));
    });
    expect(f.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/Preparation was not confirmed/)).toBeNull();
  }
);
it("still opens feedback after same-account preparation", async () => {
  f.post.mockResolvedValue({});
  render(<InterviewCompleted />);
  fireEvent.click(screen.getByRole("button", { name: "Prepare feedback" }));
  await act(async () => {});
  expect(f.replace).toHaveBeenCalledWith("/report-summary?interviewId=1");
});

it("blocks a verified Meet link when its join window has since ended", async () => {
  f.get.mockResolvedValue({ url: "https://meet.google.com/abc-defg-hij" });
  render(<HumanInterviews accountKey="first" />);
  fireEvent.click(screen.getByRole("button", { name: "Check meeting access" }));
  const link = await screen.findByRole("link", { name: /Open Google Meet/ });
  const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2099-10-22"));
  try {
    expect(fireEvent.click(link)).toBe(false);
    expect(screen.queryByRole("link", { name: /Open Google Meet/ })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("join window ended");
  } finally {
    clock.mockRestore();
  }
});
