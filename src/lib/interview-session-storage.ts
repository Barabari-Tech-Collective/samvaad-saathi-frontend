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
  const key = getInterviewQuestionsStorageKey(interviewId);
  localStorage.setItem(key, JSON.stringify(questions));
}

export function getInterviewQuestions(interviewId: number): unknown {
  if (typeof window === "undefined") return null;
  const key = getInterviewQuestionsStorageKey(interviewId);
  const raw = localStorage.getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function clearInterviewQuestions(interviewId: number): void {
  if (typeof window === "undefined") return;
  const key = getInterviewQuestionsStorageKey(interviewId);
  localStorage.removeItem(key);
}
