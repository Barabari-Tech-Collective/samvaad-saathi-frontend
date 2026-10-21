import { describe, expect, it } from "vitest";
import { parseCompletionEnvelope, parseSubmissionReceipt } from "@/lib/submission-receipt";
import { hasReportEnvelope } from "@/lib/practice-report";
const receipt = {
  planned: 5,
  answered: 2,
  skipped: 1,
  unresolved: 1,
  unreached: 1,
  reason: "time_limit",
};
describe("submission evidence", () => {
  it("accepts bounded disjoint counts, including zero saved answers", () => {
    expect(parseSubmissionReceipt(receipt)).toEqual(receipt);
    expect(parseSubmissionReceipt({ ...receipt, answered: 0, unreached: 3 }).answered).toBe(0);
  });
  it.each([
    null,
    {},
    { ...receipt, planned: 0 },
    { ...receipt, answered: true },
    { ...receipt, answered: -1 },
    { ...receipt, answered: 1.5 },
    { ...receipt, planned: Infinity },
    { ...receipt, planned: Number.MAX_SAFE_INTEGER + 1 },
    { ...receipt, skipped: "1" },
    { ...receipt, unreached: 2 },
    { ...receipt, reason: "completed" },
    { ...receipt, reason: "unknown" },
    { ...receipt, version: 2 },
    { ...receipt, presented: 5 },
  ])("rejects malformed or contradictory receipt %j", (value) => {
    expect(() => parseSubmissionReceipt(value)).toThrow();
  });
  it("binds optional receipt identity to the requested sitting", () => {
    expect(() => parseSubmissionReceipt({ ...receipt, interviewId: 2 }, "1")).toThrow();
    expect(
      parseSubmissionReceipt({ ...receipt, interviewId: 1, version: 1, presented: 4 }, "1")
    ).toBeTruthy();
  });
  it("retains completed legacy status without inventing receipt counts", () => {
    expect(parseCompletionEnvelope({ status: "completed", receipt: null }, "1").receipt).toBeNull();
  });
  it.each([
    {},
    { receipt, status: "" },
    { receipt, status: "completed", interviewMode: "unknown" },
    { status: "completed" },
  ])("rejects unverifiable completion envelope %j", (value) => {
    expect(() => parseCompletionEnvelope(value, "1")).toThrow();
  });
  it("requires a report envelope rather than treating any HTTP 200 as available feedback", () => {
    expect(hasReportEnvelope({})).toBe(false);
    expect(
      hasReportEnvelope({
        candidateInfo: { roleTopic: "Communication", interviewDate: "invalid" },
        questionAnalysis: [],
      })
    ).toBe(false);
    expect(
      hasReportEnvelope({
        candidateInfo: { roleTopic: "Communication", interviewDate: "2026-10-20T10:00:00Z" },
        questionAnalysis: [],
        reportStatus: "partial",
      })
    ).toBe(true);
  });
});
