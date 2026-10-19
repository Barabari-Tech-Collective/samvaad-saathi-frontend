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
      return "Feedback needs review";
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

export function reportRecoveryCopy(
  kind: "invalid" | "checking" | "missing" | "denied" | "unavailable" | "malformed"
) {
  switch (kind) {
    case "invalid":
      return {
        title: "Choose a report from History",
        body: "This link does not identify a valid interview. Open History and select the round you want to review.",
      };
    case "checking":
      return {
        title: "Checking your report",
        body: "We are loading the latest available feedback. No score is shown until it can be checked.",
      };
    case "missing":
      return {
        title: "This report is unavailable",
        body: "A saved report could not be found for this request. It may not have been prepared, or this session may not be available to your account. Check History or try again later.",
      };
    case "denied":
      return {
        title: "Report access could not be verified",
        body: "We cannot verify access to this report. Check that you are using the right account, or ask your program team for help.",
      };
    case "malformed":
      return {
        title: "Report details could not be verified",
        body: "The response is incomplete. No score has been substituted. Retry loading the report or return to History.",
      };
    default:
      return {
        title: "Your report could not be loaded",
        body: "A connection or service problem prevented this check. This does not confirm whether feedback is ready. Try again or return to History.",
      };
  }
}
