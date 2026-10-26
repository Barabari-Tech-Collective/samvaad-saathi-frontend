import { describe, expect, it } from "vitest";

import { profilesForMode, type InterviewMode } from "@/lib/interview-mode";

describe("profilesForMode", () => {
  const profiles = [
    { id: 1, interviewMode: "assessment" as const },
    { id: 2, interviewMode: "practice" as const },
    { id: 3 },
  ];

  it("shows only assessment-configured roles in the Assessment picker", () => {
    expect(profilesForMode(profiles, "assessment")).toEqual([profiles[0]]);
  });

  it("fails closed when a profile has no mode", () => {
    const profilesWithUnknownMode: Array<{ id: number; interviewMode?: InterviewMode }> = [
      { id: 3 },
    ];

    expect(profilesForMode(profilesWithUnknownMode, "assessment")).toEqual([]);
  });
});
