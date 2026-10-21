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
    expect(focusProgress(NaN, 3)).toBe(0);
    expect(focusProgress(1, Infinity)).toBe(0);
  });
});

import { parsePracticeHub, savedPracticeExpired } from "@/lib/practice-hub";
import { practiceHub } from "./fixtures/practice-hub";

it("accepts valid verified state including a new student's zero activity", () => {
  const hub = practiceHub();
  expect(parsePracticeHub(hub)).toBe(hub);
  hub.resume = null;
  hub.activity = { practiceDaysStreak: 0, completedMocksThisWeek: 0, completedDrillsThisWeek: 0 };
  expect(parsePracticeHub(hub)).toBe(hub);
});
it.each([null, {}, [], { activity: null }])("rejects missing hub fields: %j", (value) => {
  expect(parsePracticeHub(value)).toBeNull();
});
it.each([-1, NaN, Infinity, 1.5, "3"])("rejects malformed activity counts: %s", (count) => {
  const hub = practiceHub();
  expect(
    parsePracticeHub({ ...hub, activity: { ...hub.activity, completedMocksThisWeek: count } })
  ).toBeNull();
});
it.each([
  { interviewId: 0 },
  { answeredQuestions: 6 },
  { expiresAt: "invalid" },
  { status: "completed" },
  { totalQuestions: -1 },
])("rejects impossible resume state: %j", (changed) => {
  const hub = practiceHub();
  expect(parsePracticeHub({ ...hub, resume: { ...hub.resume, ...changed } })).toBeNull();
});
it.each(["javascript:alert(1)", "https://example.test", "/history"])(
  "rejects an unsupported focus destination: %s",
  (href) => {
    expect(
      parsePracticeHub({
        ...practiceHub(),
        focus: {
          module: "pace",
          title: "Slow down",
          reason: "Saved evidence",
          evidenceAnswerCount: 3,
          href,
        },
      })
    ).toBeNull();
  }
);
it("accepts a supported focus and checks the exact expiry boundary", () => {
  const hub = practiceHub();
  expect(
    parsePracticeHub({
      ...hub,
      focus: {
        module: "pace",
        title: "Slow down",
        reason: "Saved evidence",
        evidenceAnswerCount: 3,
        href: "/control-your-pace",
      },
    })
  ).not.toBeNull();
  hub.resume!.expiresAt = "2026-10-20T10:00:00Z";
  expect(savedPracticeExpired(hub.resume, Date.parse(hub.resume!.expiresAt))).toBe(true);
  expect(savedPracticeExpired(hub.resume, Date.parse(hub.resume!.expiresAt) - 1)).toBe(false);
});

it("malformed focus module objects cannot throw while validating JSON", () => {
  expect(
    parsePracticeHub({
      ...practiceHub(),
      focus: { module: { toString: {} }, href: "/control-your-pace" },
    })
  ).toBeNull();
});

it.each(["enrollment_revoked", "enrollment_unverified", "plan_unavailable"] as const)(
  "allows explicitly unknown counts for %s without inventing zero",
  (readiness) => {
    const hub = practiceHub();
    hub.resume!.readiness = readiness;
    hub.resume!.answeredQuestions = null;
    hub.resume!.totalQuestions = null;
    expect(parsePracticeHub(hub)).toBe(hub);
  }
);
it.each(["ready", "preparing", "unexpected"])(
  "rejects unknown counts for readiness %s",
  (readiness) => {
    const hub = practiceHub();
    expect(
      parsePracticeHub({
        ...hub,
        resume: { ...hub.resume, readiness, answeredQuestions: null, totalQuestions: null },
      })
    ).toBeNull();
  }
);
it("reads older server responses without assuming continuation is confirmed", () => {
  const hub = practiceHub();
  delete hub.resume!.readiness;
  expect(parsePracticeHub(hub)).toBe(hub);
});
