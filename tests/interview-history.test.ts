import { describe, expect, it } from "vitest";
import {
  historyGroup,
  historyResumeHref,
  historyScore,
  historyTab,
  mergeHistory,
  parseHistoryPage,
  validInterviewId,
  type HistoryItem,
} from "@/lib/interview-history";
import { reportRecoveryCopy } from "@/lib/practice-report";
const item: HistoryItem = {
  interviewId: 42,
  track: "Communication",
  difficulty: "medium",
  status: "paused",
  createdAt: "2026-10-20T10:00:00Z",
  interviewMode: "practice",
};
describe("history and report recovery contracts", () => {
  it.each(["active", "paused", "preparing", "in_progress"])(
    "retains %s as a saved session",
    (status) => expect(historyGroup({ ...item, status })).toBe("incomplete")
  );
  it.each(["expired", "terminated", "cancelled", "unknown"])(
    "retains %s in closed/other instead of omitting it",
    (status) => expect(historyGroup({ ...item, status })).toBe("closed")
  );
  it("updates duplicates from later responses without multiplying history", () => {
    expect(
      mergeHistory([
        { items: [item], nextCursor: 42, limit: 20 },
        { items: [{ ...item, status: "completed" }], nextCursor: null, limit: 20 },
      ])
    ).toEqual([{ ...item, status: "completed" }]);
  });
  it.each([0, -1, NaN, "42"])("rejects malformed IDs in response: %s", (id) => {
    expect(() =>
      parseHistoryPage({ items: [{ ...item, interviewId: id }], nextCursor: null, limit: 20 }, null)
    ).toThrow();
  });
  it("rejects empty or nonadvancing cursor pages", () => {
    expect(() => parseHistoryPage({ items: [], nextCursor: 40, limit: 20 }, 42)).toThrow();
    expect(() => parseHistoryPage({ items: [item], nextCursor: 42, limit: 20 }, 42)).toThrow();
    expect(parseHistoryPage({ items: [item], nextCursor: 42, limit: 20 }, null).items).toHaveLength(
      1
    );
  });
  it.each([null, "", "0", "-1", "1.2", "1e3", "NaN", "9007199254740993", "../42"])(
    "rejects invalid report URL id %s",
    (id) => expect(validInterviewId(id)).toBe(false)
  );
  it("preserves zero scores and never substitutes zero for missing scores", () => {
    expect(historyScore(0)).toBe("0%");
    expect(historyScore(null)).toBe("Not available");
    expect(historyScore(NaN)).toBe("Not available");
    expect(historyScore(101)).toBe("Not available");
  });
  it("uses explicit modes and suppresses expired, preparing or unknown continuations", () => {
    expect(historyResumeHref(item, 0)).toContain("interviewMode=practice");
    expect(
      historyResumeHref({ ...item, status: "active", interviewMode: "assessment" }, 0)
    ).toContain("interviewMode=assessment");
    expect(historyResumeHref({ ...item, interviewMode: undefined }, 0)).toBeNull();
    expect(historyResumeHref({ ...item, status: "preparing" }, 0)).toBeNull();
    expect(historyResumeHref({ ...item, interviewMode: "assessment" }, 0)).toBeNull();
    expect(historyResumeHref({ ...item, status: "in_progress" }, 0)).toBeNull();
    expect(
      historyResumeHref(
        { ...item, expiresAt: "2026-10-20T10:00:00Z" },
        Date.parse("2026-10-20T10:00:00Z")
      )
    ).toBeNull();
  });
  it("handles URL filters and reports recovery reasons honestly", () => {
    expect(historyTab("completed")).toBe("completed");
    expect(historyTab("other")).toBe("incomplete");
    expect(reportRecoveryCopy("missing").title).toBe("This report is unavailable");
    expect(reportRecoveryCopy("denied").title).toContain("access");
    expect(reportRecoveryCopy("unavailable").body).toContain("does not confirm");
  });
});
