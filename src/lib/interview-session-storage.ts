/**
 * Local storage helpers for interview questions.
 * Used to avoid 413 (Payload Too Large) when navigating to interview with resume/reattempt.
 */

const STORAGE_KEY_PREFIX = "interview_questions_";

export function getInterviewQuestionsStorageKey(interviewId: number): string {
  return `${STORAGE_KEY_PREFIX}${interviewId}`;
}

export function setInterviewQuestions(interviewId: number, questions: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const key = getInterviewQuestionsStorageKey(interviewId);
    localStorage.setItem(key, JSON.stringify(questions));
  } catch {
    // Browser storage can be unavailable (private mode, quota exhaustion, or an
    // embedded webview). Questions are always sourced from the verified API, so
    // this optional navigation cache must never prevent an interview from opening.
  }
}

export function getInterviewQuestions(interviewId: number): unknown {
  if (typeof window === "undefined") return null;
  try {
    const key = getInterviewQuestionsStorageKey(interviewId);
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function clearInterviewQuestions(interviewId: number): void {
  if (typeof window === "undefined") return;
  try {
    const key = getInterviewQuestionsStorageKey(interviewId);
    localStorage.removeItem(key);
  } catch {
    // The interview may already be complete; an inaccessible optional cache must
    // not block completion/navigation.
  }
}
