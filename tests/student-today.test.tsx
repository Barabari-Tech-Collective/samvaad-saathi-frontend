import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { StudentToday } from "@/components/workspace/StudentToday";

const state = vi.hoisted(() => ({ human: {} as unknown, assessment: {} as unknown }));

vi.mock("@/lib/api-config", () => ({
  ENDPOINTS: { INTERVIEWS: { WITH_SUMMARY: "interviews-with-summary" } },
  apiClient: {
    useQuery: ({ url }: { url: string }) => {
      if (url.startsWith("v2/human-interviews"))
        return { data: state.human, isLoading: false, isFetching: false, isError: false };
      if (url.startsWith("interviews-with-summary"))
        return { data: state.assessment, isLoading: false, isFetching: false, isError: false };
      return { data: { items: [] }, isLoading: false, isFetching: false, isError: false };
    },
  },
}));

beforeEach(() => {
  state.human = {
    items: [
      {
        id: 7,
        title: "Technical round",
        opportunity_title: "Developer",
        round_name: "Round 1",
        starts_at: "2026-10-31T10:00:00Z",
        ends_at: "2026-10-31T11:00:00Z",
        join_opens_at: "2026-10-31T09:45:00Z",
        timezone: "Asia/Kolkata",
        duration_minutes: 60,
        interviewer_name: "Asha",
        meeting_platform: "Google Meet",
        instructions: null,
        status: "scheduled",
        can_join: true,
        outcome_source: null,
      },
    ],
    total: 1,
    notice: "",
  };
  state.assessment = {
    items: [{ interview_id: 9, track: "Analyst", interview_mode: "assessment", status: "active" }],
  };
});

it("prioritises a currently joinable Human Interview above an AI assessment", () => {
  render(<StudentToday accountKey="1" />);
  const action = screen.getByRole("link", { name: /join your human interview/i });
  expect(action).toHaveAttribute("href", "/human-interviews");
  expect(screen.queryByText(/continue ai interview/i)).toBeNull();
});

it("does not expose an action when the live-interview response is malformed", () => {
  state.human = { items: [{ id: 7, status: "scheduled" }], total: 1, notice: "" };
  state.assessment = { items: [] };
  render(<StudentToday accountKey="1" />);
  expect(screen.getByText("Nothing needs your attention right now.")).toBeInTheDocument();
});
