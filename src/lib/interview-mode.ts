export type InterviewMode = "practice" | "assessment";

export interface InterviewModeProfile {
  interviewMode?: InterviewMode;
}

export function profilesForMode<T extends InterviewModeProfile>(
  profiles: readonly T[],
  mode: InterviewMode
): T[] {
  // Fail closed when the API omits the mode. A role with an unknown mode must
  // never appear in the formal Assessment picker and silently create Practice.
  return profiles.filter((profile) => profile.interviewMode === mode);
}
