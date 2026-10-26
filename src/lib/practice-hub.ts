export interface PracticeHubActivity {
  practiceDaysStreak: number;
  completedMocksThisWeek: number;
  completedDrillsThisWeek: number;
}

export interface PracticeHubResumeCard {
  interviewId: number;
  track: string;
  difficulty: string;
  status: "active" | "paused";
  answeredQuestions: number;
  totalQuestions: number;
  expiresAt: string | null;
}

export interface PracticeHubFocus {
  module: "structure" | "pronunciation" | "pace" | "warm_up" | "think_fast";
  title: string;
  reason: string;
  href: string;
  evidenceAnswerCount: number;
}

export interface PracticeHubResponse {
  activity: PracticeHubActivity;
  resume: PracticeHubResumeCard | null;
  focus: PracticeHubFocus | null;
  focusEvidenceAnswerCount: number;
  focusEvidenceRequired: number;
}

export function firstName(name: string | null | undefined): string {
  const normalized = name?.trim();
  return normalized ? normalized.split(/\s+/)[0] : "there";
}

export function activitySummary(activity: PracticeHubActivity): string {
  const parts: string[] = [];
  if (activity.practiceDaysStreak > 0) {
    parts.push(`${activity.practiceDaysStreak}-day streak`);
  }
  parts.push(
    `${activity.completedMocksThisWeek} mock${activity.completedMocksThisWeek === 1 ? "" : "s"}`
  );
  parts.push(
    `${activity.completedDrillsThisWeek} drill${activity.completedDrillsThisWeek === 1 ? "" : "s"} this week`
  );
  return parts.join(" · ");
}

export function focusProgress(current: number, required: number): number {
  if (required <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / required) * 100)));
}
