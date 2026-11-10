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
      return "A few more answers needed";
    default:
      return "Coaching report ready";
  }
};

export const confidenceCopy = (confidence: EvidenceConfidence): string => {
  switch (confidence) {
    case "high":
      return "Enough for clear feedback";
    case "medium":
      return "Enough for useful feedback";
    case "low":
      return "Some feedback is still on its way";
    default:
      return "Not enough to give a score yet";
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
      return "Not available yet";
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
  return href && allowed.has(href) ? href : "/coaching";
};

export function reportRecoveryCopy(
  kind: "invalid" | "checking" | "missing" | "denied" | "unavailable" | "malformed"
) {
  switch (kind) {
    case "invalid":
      return {
        title: "Choose your feedback in Progress",
        body: "This link isn't right. Open Progress and choose your interview.",
      };
    case "checking":
      return {
        title: "Just a moment",
        body: "Getting your feedback…",
      };
    case "missing":
      return {
        title: "This feedback isn't available",
        body: "We couldn't find this feedback. Check Progress or try again later.",
      };
    case "denied":
      return {
        title: "We couldn't open your feedback",
        body: "We couldn't open this feedback. Check you are on the right account, or ask your teacher.",
      };
    case "malformed":
      return {
        title: "We couldn't open your feedback",
        body: "Part of your feedback didn't load. Please try again.",
      };
    default:
      return {
        title: "We couldn't load your feedback",
        body: "Please check your connection and try again.",
      };
  }
}

export function hasReportEnvelope(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const candidate = row.candidateInfo as Record<string, unknown> | null | undefined;
  return (
    !!candidate &&
    typeof candidate.roleTopic === "string" &&
    typeof candidate.interviewDate === "string" &&
    Number.isFinite(Date.parse(candidate.interviewDate)) &&
    (row.reportStatus === undefined ||
      ["ready", "partial", "needs_review", "insufficient_evidence"].includes(
        row.reportStatus as string
      )) &&
    Array.isArray(row.questionAnalysis) &&
    row.questionAnalysis.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).question === "string"
    )
  );
}
