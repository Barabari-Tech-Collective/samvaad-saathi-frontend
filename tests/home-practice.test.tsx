import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import HomePractice from "@/components/workspace/HomePractice";
import { practiceHub } from "./fixtures/practice-hub";
const fixture = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  },
  useQuery: vi.fn(),
}));
vi.mock("@/lib/api-config", () => ({
  apiClient: {
    useQuery: (options: unknown) => {
      fixture.useQuery(options);
      return fixture.query;
    },
  },
  ENDPOINTS: { PRACTICE: { HUB: "practice/hub" } },
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({ trackButtonClick: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
beforeEach(() => {
  fixture.query = {
    data: practiceHub(),
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  };
  fixture.useQuery.mockClear();
});
afterEach(() => vi.useRealTimers());
it("offers a direct practice-only continuation for a verified saved round", () => {
  render(<HomePractice accountKey="student-1" />);
  expect(screen.getByRole("link", { name: "Continue interview" })).toHaveAttribute(
    "href",
    "/interview?interviewId=42&resumed=true&interviewMode=practice"
  );
  expect(screen.getByText(/2 of 5 answers saved/)).toBeVisible();
  expect(fixture.useQuery).toHaveBeenCalledWith(
    expect.objectContaining({ key: ["practice/hub", "student-1"] })
  );
});
it.each([
  "preparing",
  "enrollment_revoked",
  "enrollment_unverified",
  "plan_unavailable",
  undefined,
] as const)("keeps %s saved rounds out of the room", (readiness) => {
  const hub = practiceHub();
  hub.resume!.readiness = readiness;
  fixture.query.data = hub;
  render(<HomePractice accountKey="student-1" />);
  expect(screen.queryByRole("link", { name: "Continue interview" })).toBeNull();
  expect(screen.getByRole("link", { name: "Check saved practice" })).toHaveAttribute(
    "href",
    "/practice"
  );
  expect(screen.queryByRole("link", { name: "Set up an interview" })).toBeNull();
});
it.each(["isLoading", "isFetching"] as const)("suppresses stale continuation while %s", (key) => {
  fixture.query[key] = true;
  render(<HomePractice accountKey="student-1" />);
  expect(screen.queryByRole("link", { name: "Continue interview" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Set up an interview" })).toBeNull();
});
it.each([null, { malformed: true }])(
  "offers recovery rather than a duplicate round for invalid data",
  (data) => {
    fixture.query.data = data;
    render(<HomePractice accountKey="student-1" />);
    expect(screen.getByRole("link", { name: "Check saved sessions" })).toHaveAttribute(
      "href",
      "/history"
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(fixture.query.refetch).toHaveBeenCalledOnce();
  }
);
it("does not use cached session data after a request failure", () => {
  fixture.query.isError = true;
  render(<HomePractice accountKey="student-1" />);
  expect(screen.queryByRole("link", { name: "Continue interview" })).toBeNull();
  expect(screen.getByRole("link", { name: "Check saved sessions" })).toBeVisible();
});
it("shows a setup path and steps only when no saved round is confirmed", () => {
  const hub = practiceHub();
  hub.resume = null;
  fixture.query.data = hub;
  render(<HomePractice accountKey="student-1" />);
  expect(screen.getByRole("link", { name: "Set up an interview" })).toHaveAttribute(
    "href",
    "/interview-start?mode=practice"
  );
  expect(screen.getByRole("list", { name: "Practice interview steps" })).toBeVisible();
});
it("expires a continuation while Home remains open", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T10:00:00Z"));
  const hub = practiceHub();
  hub.resume!.expiresAt = "2026-10-22T10:00:02Z";
  fixture.query.data = hub;
  render(<HomePractice accountKey="student-1" />);
  expect(screen.getByRole("link", { name: "Continue interview" })).toBeVisible();
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.queryByRole("link", { name: "Continue interview" })).toBeNull();
  expect(screen.getByText(/resume window has ended/)).toBeVisible();
});
