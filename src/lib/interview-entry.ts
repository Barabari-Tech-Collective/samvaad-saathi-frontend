import { validInterviewId } from "@/lib/interview-history";
import type { InterviewMode } from "@/lib/interview-mode";

export function publishedQuestionCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 50
    ? value
    : null;
}

export function createdInterview(value: unknown, mode: InterviewMode, expected: number) {
  if (!value || typeof value !== "object")
    throw new Error("The new sitting could not be verified.");
  const row = value as Record<string, unknown>;
  const id =
    typeof row.interviewId === "number" || typeof row.interviewId === "string"
      ? String(row.interviewId)
      : null;
  if (
    !validInterviewId(id) ||
    row.interviewMode !== mode ||
    row.plannedQuestionCount !== expected ||
    publishedQuestionCount(expected) === null
  )
    throw new Error(
      "The new sitting's identity, purpose or question count could not be verified. Check History before starting another."
    );
  return id;
}
