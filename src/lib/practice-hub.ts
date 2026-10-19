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
  if (!Number.isFinite(current) || !Number.isFinite(required) || required <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / required) * 100)));
}

const FOCUS_PATHS: Record<PracticeHubFocus["module"], string> = {
  structure: "/structure-your-answer",
  pronunciation: "/pronunciation-practice",
  pace: "/control-your-pace",
  warm_up: "/warm-up-chat",
  think_fast: "/think-fast",
};

/** Reject malformed server state rather than invent progress or unsafe links. */
export function parsePracticeHub(value: unknown): PracticeHubResponse | null {
  if (!value || typeof value !== "object") return null;
  const hub = value as Record<string, unknown>;
  const count = (n: unknown): n is number =>
    typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  const text = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
  const activity = hub.activity as PracticeHubActivity | undefined;
  if (
    !activity ||
    !count(activity.practiceDaysStreak) ||
    !count(activity.completedMocksThisWeek) ||
    !count(activity.completedDrillsThisWeek) ||
    !count(hub.focusEvidenceAnswerCount) ||
    !count(hub.focusEvidenceRequired) ||
    hub.focusEvidenceRequired === 0
  )
    return null;
  if (hub.resume !== null) {
    const resume = hub.resume as PracticeHubResumeCard | undefined;
    if (
      !resume ||
      !count(resume.interviewId) ||
      resume.interviewId === 0 ||
      !text(resume.track) ||
      !text(resume.difficulty) ||
      !["active", "paused"].includes(resume.status) ||
      !count(resume.answeredQuestions) ||
      !count(resume.totalQuestions) ||
      resume.answeredQuestions > resume.totalQuestions ||
      !(
        resume.expiresAt === null ||
        (typeof resume.expiresAt === "string" && Number.isFinite(Date.parse(resume.expiresAt)))
      )
    )
      return null;
  }
  if (hub.focus !== null) {
    const focus = hub.focus as PracticeHubFocus | undefined;
    if (
      !focus ||
      typeof focus.module !== "string" ||
      !Object.hasOwn(FOCUS_PATHS, focus.module) ||
      focus.href !== FOCUS_PATHS[focus.module] ||
      !text(focus.title) ||
      !text(focus.reason) ||
      !count(focus.evidenceAnswerCount)
    )
      return null;
  }
  return value as PracticeHubResponse;
}

export function savedPracticeExpired(resume: PracticeHubResumeCard | null, now: number): boolean {
  return !!resume?.expiresAt && Date.parse(resume.expiresAt) <= now;
}
