import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PracticeHubView } from "@/components/practice/PracticeHub";
import { practiceHub } from "./fixtures/practice-hub";
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({ trackButtonClick: vi.fn() }));
afterEach(() => vi.useRealTimers());
function view(
  status: "ready" | "refreshing" | "loading" | "error",
  hub = practiceHub(),
  area: "mock" | "coaching" | "legacy" = "mock"
) {
  return <PracticeHubView hub={hub} status={status} name="Riya" onRefresh={vi.fn()} area={area} />;
}
describe("Mock Interview entry", () => {
  it("shows server-confirmed progress and a mock-only resume action", () => {
    render(view("ready"));
    expect(screen.getByText(/2 of 5 answers are saved/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Continue Mock Interview" })).toHaveAttribute(
      "href",
      "/interview?interviewId=42&resumed=true&interviewMode=practice"
    );
  });
  it.each(["loading", "refreshing", "error"] as const)(
    "does not expose stale progress during %s",
    (status) => {
      render(view(status));
      expect(screen.queryByText(/2 of 5 answers are saved/)).toBeNull();
      expect(screen.queryByRole("progressbar")).toBeNull();
      expect(screen.queryByRole("link", { name: "Continue Mock Interview" })).toBeNull();
      expect(screen.queryByRole("link", { name: /Warm-up chat/ })).toBeNull();
    }
  );
  it("retries an unavailable plan without showing fictional zero activity", () => {
    const retry = vi.fn();
    render(<PracticeHubView status="error" hub={null} name="Riya" onRefresh={retry} area="mock" />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Find saved interviews" })).toHaveAttribute(
      "href",
      "/history"
    );
    expect(screen.queryByText(/0 mocks/)).toBeNull();
  });
  it("handles question preparation without presenting 0 of 0 progress", () => {
    const hub = practiceHub();
    hub.resume!.answeredQuestions = 0;
    hub.resume!.totalQuestions = 0;
    hub.resume!.readiness = "preparing";
    render(view("ready", hub));
    expect(screen.getByRole("link", { name: "View saved session" })).toBeVisible();
    expect(screen.queryByText(/0 of 0/)).toBeNull();
  });
  it("removes an expired resume action while the page stays open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
    const hub = practiceHub();
    hub.resume!.expiresAt = "2026-10-20T10:00:02Z";
    render(view("ready", hub));
    expect(screen.getByRole("link", { name: "Continue Mock Interview" })).toBeVisible();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole("link", { name: "Continue Mock Interview" })).toBeNull();
    expect(screen.getByText(/resume window has ended/)).toBeVisible();
  });
});

it("shows personalised evidence guidance only in Coaching", () => {
  const hub = practiceHub();
  hub.focusEvidenceAnswerCount = 4;
  render(view("ready", hub, "coaching"));
  expect(screen.getByRole("heading", { name: "Keep exploring your skills" })).toBeVisible();
  expect(screen.getByText(/no single focus stands out/)).toBeVisible();
});

it.each([
  "preparing",
  "enrollment_revoked",
  "enrollment_unverified",
  "plan_unavailable",
  undefined,
] as const)("keeps a %s session visible without offering unchecked continuation", (readiness) => {
  const hub = practiceHub();
  hub.resume!.readiness = readiness;
  if (readiness === "plan_unavailable") {
    hub.resume!.answeredQuestions = null;
    hub.resume!.totalQuestions = null;
  }
  const retry = vi.fn();
  render(<PracticeHubView hub={hub} status="ready" name="Riya" onRefresh={retry} area="mock" />);
  expect(screen.queryByRole("link", { name: "Continue Mock Interview" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Start Mock Interview" })).toBeNull();
  expect(screen.queryByText(/2 of 5 answers are saved/)).toBeNull();
  expect(screen.getByRole("link", { name: "View saved session" })).toHaveAttribute(
    "href",
    "/history"
  );
  fireEvent.click(screen.getByRole("button", { name: "Check again" }));
  expect(retry).toHaveBeenCalledOnce();
});

it("keeps skills and assignments out of Mock Interviews while Coaching has no mock-start action", () => {
  const mockHub = practiceHub();
  mockHub.resume = null;
  render(view("ready", mockHub, "mock"));
  expect(screen.queryByRole("link", { name: "Warm-up chat" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Start Mock Interview" })).toBeInTheDocument();
  const coaching = render(view("ready", practiceHub(), "coaching"));
  expect(screen.getByRole("link", { name: /Warm-up chat/ })).toBeInTheDocument();
  expect(screen.queryAllByRole("link", { name: "Start Mock Interview" })).toHaveLength(1);
  coaching.unmount();
});
