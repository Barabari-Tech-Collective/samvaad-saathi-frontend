/** Enrollment holds preserve evidence; they are not cheating or scoring outcomes. */
export function courseAccessMessage(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: { code?: string } } } })?.response?.data
    ?.detail;
  if (detail?.code === "COURSE_ACCESS_REVOKED")
    return "You're no longer in this course. Your answers are safe. Ask your teacher for help.";
  if (detail?.code === "COURSE_ACCESS_UNVERIFIED")
    return "We couldn't confirm your course. Your answers are safe. Ask your teacher for help.";
  return null;
}
