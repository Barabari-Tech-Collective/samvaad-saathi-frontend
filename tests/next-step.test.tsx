import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NextStep } from "@/components/workspace/NextStep";

const state = vi.hoisted(() => ({ today: {} as unknown }));

vi.mock("@/lib/api-config", () => ({
  apiClient: {
    useQuery: ({ url }: { url: string }) => ({
      data: url === "v2/student-home/today" ? state.today : {},
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }),
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const activity = {
  practiceDaysStreak: 0,
  completedMocksThisWeek: 0,
  completedDrillsThisWeek: 0,
  dailyActivity: [],
};

beforeEach(() => {
  state.today = {
    action: { kind: "human_interview", title: "Join your interview", detail: "It is open now.", href: "/human-interviews" },
    activity,
    has_assessments: false,
  };
});

it("shows one action, chosen by the server", () => {
  render(<NextStep accountKey="1" />);
  expect(screen.getByRole("link", { name: /start/i })).toHaveAttribute("href", "/human-interviews");
  expect(screen.getByText("Join your interview")).toBeInTheDocument();
});

it("says who asked and when it is due for teacher work", () => {
  state.today = {
    action: { kind: "coaching_assignment", title: "Think fast", detail: "Your teacher asked for this.", href: "/coaching", from_teacher: true, due_date: "2026-11-14" },
    activity,
    has_assessments: false,
  };
  render(<NextStep accountKey="1" />);
  expect(screen.getByText("From your teacher")).toBeInTheDocument();
  expect(screen.getByText(/Due .*14 Nov/)).toBeInTheDocument();
});

it("offers a retry and no link when the answer can't be trusted", () => {
  state.today = { action: { kind: "human_interview", href: "https://bad.test" }, activity };
  render(<NextStep accountKey="1" />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.queryByRole("link")).toBeNull();
});
