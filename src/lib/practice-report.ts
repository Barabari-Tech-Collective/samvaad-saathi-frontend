import type {
  EvidenceConfidence,
  QuestionEvidenceStatus,
  ReportStatus,
} from "@/app/(protected)/report-summary/_components/types";

export const reportStatusCopy = (status: ReportStatus | undefined): string => {
  switch (status) {
    case "partial":
      return "Partial coaching report";
    case "needs_review":
      return "Coaching is still being prepared";
    case "insufficient_evidence":
      return "More evidence needed";
    default:
      return "Coaching report ready";
  }
};

export const confidenceCopy = (confidence: EvidenceConfidence): string => {
  switch (confidence) {
    case "high":
      return "Strong evidence coverage";
    case "medium":
      return "Useful evidence coverage";
    case "low":
      return "Some analysis is still unavailable";
    default:
      return "Not enough evidence to score reliably";
  }
};

export const questionEvidenceCopy = (status: QuestionEvidenceStatus): string => {
  switch (status) {
    case "evaluated":
      return "Evaluated";
    case "needs_review":
      return "Analysis pending";
    case "insufficient":
      return "Not enough speech";
    case "unavailable":
      return "Evidence unavailable";
    default:
      return "Not attempted";
  }
};

export const safeDrillHref = (href: string | null | undefined): string => {
  const allowed = new Set([
    "/structure-your-answer",
    "/pronunciation-practice",
    "/control-your-pace",
    "/warm-up-chat",
    "/think-fast",
  ]);
  return href && allowed.has(href) ? href : "/practice";
};
