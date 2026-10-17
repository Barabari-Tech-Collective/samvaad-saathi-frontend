import { describe, expect, it } from "vitest";

import { activitySummary, firstName, focusProgress } from "@/lib/practice-hub";

describe("Practice hub presentation", () => {
  it("uses a safe greeting when a student name is missing", () => {
    expect(firstName(undefined)).toBe("there");
    expect(firstName("  Riya Sharma ")).toBe("Riya");
  });

  it("pluralises weekly activity without inventing a streak", () => {
    expect(
      activitySummary({
        practiceDaysStreak: 0,
        completedMocksThisWeek: 1,
        completedDrillsThisWeek: 2,
      })
    ).toBe("1 mock · 2 drills this week");
  });

  it("clamps evidence progress for malformed or excess values", () => {
    expect(focusProgress(1, 3)).toBe(33);
    expect(focusProgress(9, 3)).toBe(100);
    expect(focusProgress(-1, 3)).toBe(0);
    expect(focusProgress(1, 0)).toBe(0);
  });
});
