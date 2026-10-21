/** Enrollment holds preserve evidence; they are not cheating or scoring outcomes. */
export function courseAccessMessage(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: { code?: string } } } })?.response?.data
    ?.detail;
  if (detail?.code === "COURSE_ACCESS_REVOKED")
    return "Course enrollment is no longer available for this interview. Saved answers are retained. Ask your program team to check enrollment before continuing.";
  if (detail?.code === "COURSE_ACCESS_UNVERIFIED")
    return "Current course enrollment could not be verified. Saved answers are retained. Ask your program team to refresh enrollment, then retry.";
  return null;
}
