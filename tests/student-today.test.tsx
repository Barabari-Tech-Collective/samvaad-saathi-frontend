import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { StudentToday } from "@/components/workspace/StudentToday";

const state = vi.hoisted(() => ({ today: {} as unknown }));

vi.mock("@/lib/api-config", () => ({
  apiClient: {
    useQuery: ({ url }: { url: string }) => {
      return {
        data: url === "v2/student-home/today" ? state.today : {},
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      };
    },
  },
}));

beforeEach(() => {
  state.today = {
    action: {
      kind: "human_interview",
      title: "Join your Human Interview",
      detail: "Your verified meeting access is open.",
      href: "/human-interviews",
    },
    activity: {
      practiceDaysStreak: 0,
      completedMocksThisWeek: 0,
      completedDrillsThisWeek: 0,
      dailyActivity: [
        "2026-10-12",
        "2026-10-13",
        "2026-10-14",
        "2026-10-15",
        "2026-10-16",
        "2026-10-17",
        "2026-10-18",
      ].map((date) => ({ date, completedMocks: 0, completedDrills: 0 })),
    },
  };
});

it("renders the server-selected, verified next action", () => {
  render(<StudentToday accountKey="1" />);
  const action = screen.getByRole("link", { name: /join your human interview/i });
  expect(action).toHaveAttribute("href", "/human-interviews");
  expect(screen.queryByText(/continue ai interview/i)).toBeNull();
});

it("does not expose an action when the Today response is malformed", () => {
  state.today = { action: { kind: "human_interview", href: "https://bad.test" } };
  render(<StudentToday accountKey="1" />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
