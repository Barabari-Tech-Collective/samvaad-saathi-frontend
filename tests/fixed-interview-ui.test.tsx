import Welcome from "@/app/(protected)/interview/_components/Welcome";
import Header from "@/app/(protected)/interview/_components/Header";
import { ReceiptSummary } from "@/components/interview/SubmissionReceipt";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Fixed interview deadline and receipt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("uses the pinned server deadline, rather than a new 25-minute timer", () => {
    render(
      <Header role="Assessment" hasStarted interviewId="8" deadlineAt="2026-10-19T00:24:00Z" />
    );
    expect(screen.getByLabelText("Interview time")).toHaveTextContent("24:00");
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByLabelText("Interview time")).toHaveTextContent("23:00");
  });

  it("corrects clock offset and expires only once", () => {
    const expired = vi.fn();
    render(
      <Header
        hasStarted
        interviewId="8"
        deadlineAt="2026-10-19T00:01:02Z"
        serverClockOffsetMs={60_000}
        onTimerExpire={expired}
      />
    );
    expect(screen.getByLabelText("Interview time")).toHaveTextContent("00:02");
    act(() => vi.advanceTimersByTime(5_000));
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("does not expire untimed practice", () => {
    const expired = vi.fn();
    render(<Header hasStarted interviewId="3" deadlineAt={null} onTimerExpire={expired} />);
    expect(screen.getByLabelText("Interview time")).toHaveTextContent("no time limit");
    act(() => vi.advanceTimersByTime(3_600_000));
    expect(expired).not.toHaveBeenCalled();
  });

  it("does not describe an interrupted round as all questions answered", () => {
    render(
      <ReceiptSummary
        receipt={{
          planned: 8,
          answered: 4,
          skipped: 1,
          unresolved: 1,
          unreached: 2,
          reason: "time_limit",
        }}
      />
    );
    expect(screen.getByRole("heading")).toHaveTextContent("8 planned · 4 answers saved");
    expect(screen.getByLabelText("Submission receipt")).toHaveTextContent("2 unreached");
    expect(screen.getByText(/Time ended/)).toBeVisible();
  });
});

describe("prepared interview instructions", () => {
  it("shows the fixed assessment duration and non-punitive monitoring policy", () => {
    render(
      <Welcome
        role="Backend"
        mode="assessment"
        plannedQuestionCount={8}
        onInterviewStart={() => {}}
        isPreparing={false}
      />
    );
    expect(screen.getByText("24 minutes")).toBeVisible();
    expect(screen.getByText(/do not automatically end the assessment/)).toBeVisible();
    expect(screen.queryByText(/Leaving the tab or fullscreen ends/)).toBeNull();
  });
  it("describes new practice as untimed voice practice", () => {
    render(
      <Welcome
        role="Projects"
        mode="practice"
        plannedQuestionCount={3}
        onInterviewStart={() => {}}
        isPreparing={false}
      />
    );
    expect(screen.getByText("No time limit")).toBeVisible();
    expect(screen.queryByText(/or type when/)).toBeNull();
  });
});
