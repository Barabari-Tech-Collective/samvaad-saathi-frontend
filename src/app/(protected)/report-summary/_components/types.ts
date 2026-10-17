export type ReportStatus = "ready" | "partial" | "needs_review" | "insufficient_evidence";
export type EvidenceConfidence = "high" | "medium" | "low" | "insufficient";
export type QuestionEvidenceStatus =
  | "evaluated"
  | "needs_review"
  | "insufficient"
  | "unavailable"
  | "not_attempted";
export type PracticeModule = "structure" | "pronunciation" | "pace" | "warm_up" | "think_fast";

interface ScoreDimension {
  score: number;
  maxScore: number;
  average: number;
  maxAverage: number;
  percentage: number;
  criteria: Record<string, number>;
}

export interface ReportResponse {
  reportId: string;
  reportVersion?: string;
  reportStatus?: ReportStatus;
  generatedAt?: string | null;
  candidateInfo: {
    name: string | null;
    interviewDate: string;
    roleTopic: string;
    duration?: string | null;
    durationFeedback?: string | null;
  };
  scoreSummary: {
    knowledgeCompetence?: ScoreDimension | null;
    speechAndStructure: ScoreDimension;
  } | null;
  evidenceSummary?: {
    totalQuestions: number;
    savedAnswers: number;
    usableAnswers: number;
    evaluatedAnswers: number;
    minimumRequired: number;
    coveragePercentage: number;
    confidence: EvidenceConfidence;
    statusMessage: string;
  } | null;
  uncertaintyNotice?: string | null;
  questionAnalysis: Array<{
    id: number;
    totalQuestions: number;
    type: string;
    question: string;
    transcript?: string | null;
    feedback: {
      strengths?: string | null;
      areasOfImprovement?: string | null;
    } | null;
    evidence?: {
      status: QuestionEvidenceStatus;
      observation?: string | null;
      interpretation?: string | null;
      uncertainty?: string | null;
    } | null;
  }>;
  recommendedPractice?: {
    module?: PracticeModule;
    title: string;
    description: string;
    href?: string;
    reason?: string;
    evidenceAnswerCount?: number;
  } | null;
  speechFluencyFeedback?: {
    strengths: string;
    areasOfImprovement: string;
    ratingEmoji: string;
    ratingTitle: string;
    ratingDescription: string;
  } | null;
  nextSteps?: Array<{ title: string }> | null;
  finalTip?: { title: string; description: string } | null;
}

export type OverallScoreSummaryProps = {
  knowledgeCompetence?: ScoreDimension | null;
  speechAndStructure: ScoreDimension;
};

export type FinalSummaryProps = {
  speechFluencyFeedback: NonNullable<ReportResponse["speechFluencyFeedback"]>;
};

export type PerQuestionAnalysisProps = {
  questionAnalysis: ReportResponse["questionAnalysis"];
};
