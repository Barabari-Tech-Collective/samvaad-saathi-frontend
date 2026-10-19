import type { PracticeHubResponse } from "@/lib/practice-hub";
export function practiceHub(): PracticeHubResponse {
  return {
    activity: { practiceDaysStreak: 2, completedMocksThisWeek: 1, completedDrillsThisWeek: 3 },
    resume: {
      interviewId: 42,
      track: "Communication",
      difficulty: "medium",
      status: "paused",
      answeredQuestions: 2,
      totalQuestions: 5,
      expiresAt: null,
    },
    focus: null,
    focusEvidenceAnswerCount: 2,
    focusEvidenceRequired: 3,
  };
}
