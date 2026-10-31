import { expect, it } from "vitest";
import {
  ASSESSMENT_REVIEW_PAGE_SIZE,
  parseAssessmentReviewsPage,
  validReviewReason,
} from "@/lib/assessment-reviews";

const review = {
  id: 7,
  interview_id: 42,
  state: "decided",
  outcome: "concern",
  version: 3,
  appeal_deadline: "2026-12-01T12:00:00Z",
  can_appeal: true,
  can_explain: false,
  history: [
    {
      kind: "decide",
      reason: "Shared human observation requires review.",
      at: "2026-10-21T10:00:00Z",
      outcome: "concern",
    },
  ],
};

it("accepts a bounded, complete assessment review response", () => {
  expect(
    parseAssessmentReviewsPage({ items: [review], total: 1, notice: "Formal review" })
  ).toMatchObject({
    total: 1,
    items: [{ id: 7, interviewId: 42, canAppeal: true, canExplain: false }],
  });
});

it.each([
  ["invalid deadline", { ...review, appeal_deadline: "not-a-date" }],
  ["negative version", { ...review, version: -1 }],
  [
    "oversized reason",
    { ...review, history: [{ ...review.history[0], reason: "x".repeat(2_001) }] },
  ],
  ["malformed browser signal", { ...review, history: [{ ...review.history[0], signals: [{}] }] }],
])("rejects a %s rather than showing partial review evidence", (_name, row) => {
  expect(parseAssessmentReviewsPage({ items: [row], total: 1, notice: "" })).toBeNull();
});

it("rejects an oversized review page before a student browser renders it", () => {
  expect(
    parseAssessmentReviewsPage({
      items: Array.from({ length: ASSESSMENT_REVIEW_PAGE_SIZE + 1 }, (_, id) => ({
        ...review,
        id: id + 1,
      })),
      total: ASSESSMENT_REVIEW_PAGE_SIZE + 1,
      notice: "",
    })
  ).toBeNull();
});

it("normalizes only a valid student explanation before a protected mutation", () => {
  expect(validReviewReason("  My connection dropped during the assessment.  ")).toBe(
    "My connection dropped during the assessment."
  );
  expect(validReviewReason("Too short")).toBeNull();
  expect(validReviewReason("x".repeat(2_001))).toBeNull();
});
