import type { PracticeHubResponse } from "@/lib/practice-hub";
export function practiceHub(): PracticeHubResponse {
  return {
    activity: {
      practiceDaysStreak: 2,
      completedMocksThisWeek: 1,
      completedDrillsThisWeek: 3,
      dailyActivity: [
        "2026-10-12",
        "2026-10-13",
        "2026-10-14",
        "2026-10-15",
        "2026-10-16",
        "2026-10-17",
        "2026-10-18",
      ].map((date, index) => ({
        date,
        completedMocks: index === 6 ? 1 : 0,
        completedDrills: index === 4 ? 1 : 0,
      })),
    },
    resume: {
      interviewId: 42,
      track: "Communication",
      difficulty: "medium",
      status: "paused",
      readiness: "ready",
      answeredQuestions: 2,
      totalQuestions: 5,
      expiresAt: null,
    },
    focus: null,
    focusEvidenceAnswerCount: 2,
    focusEvidenceRequired: 3,
  };
}
