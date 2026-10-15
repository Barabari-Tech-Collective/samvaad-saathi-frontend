export type BulkATSBatchStatus = "draft" | "processing" | "completed" | "failed";
export type BulkATSCandidateStatus =
  | "queued"
  | "parsing"
  | "evaluating"
  | "completed"
  | "needs_review"
  | "failed";

export interface BulkATSSelf {
  email: string;
  isAdmin: boolean;
  jevConfigured: boolean;
  deepseekConfigured: boolean;
  ocrEnabled: boolean;
  ocrAvailable: boolean;
  malwareScannerConfigured: boolean;
  googleDriveOAuthConfigured: boolean;
}

export interface BulkATSDriveStatus {
  configured: boolean;
  configurationErrors: string[];
  connected: boolean;
  googleEmail: string | null;
  scopes: string[];
  lastUsedAt: string | null;
}

export interface BulkATSBatchSummary {
  id: number;
  name: string;
  roleName: string;
  status: BulkATSBatchStatus;
  createdAt: string;
}

export interface BulkATSBatchDetail extends BulkATSBatchSummary {
  experienceMode: "fresher" | "experienced";
  roleDescription: string | null;
  evaluationIntent: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  jdAnalysis: {
    score: number;
    level: "strong" | "adequate" | "limited";
    warnings: string[];
    riskyCriteria: string[];
    checks: Record<string, boolean>;
  } | null;
  retentionUntil: string | null;
  counts: {
    total: number;
    completed: number;
    needsReview: number;
    failed: number;
    pending: number;
  };
}

export interface BulkATSMetricSummary {
  metric: string;
  score: number;
}

export interface BulkATSCandidateBrief {
  summary: string;
  strengths: BulkATSMetricSummary[];
  gaps: BulkATSMetricSummary[];
  warnings: string[];
  recommendation: string;
  strengthNarratives?: string[];
  gapNarratives?: string[];
  interviewFocus?: string[];
}

export interface BulkATSScorecard {
  categoryScores: Record<string, number>;
  weights: Record<string, number>;
  weightedContributions: Record<string, number>;
  experienceMode: "fresher" | "experienced";
  roleContext:
    | "job_description"
    | "evaluation_intent_and_skills"
    | "evaluation_intent"
    | "role_and_skills"
    | "role_only";
  evaluationIntentApplied: boolean;
  scoringSources: "deterministic_and_jev" | "deterministic_only";
  jevAverageConfidence: number | null;
  evidence: Record<string, Array<{ source: string; text: string }>>;
  confidence: {
    overall: number;
    level: "high" | "medium" | "low";
    scoreInterval: { lower: number; upper: number };
    categoryConfidence: Record<string, number>;
    factors: Record<string, number>;
    policy: string;
  };
}

export interface BulkATSDeterministicReport extends Record<string, unknown> {
  bulkAtsScorecard?: BulkATSScorecard;
  candidateBrief?: BulkATSCandidateBrief;
}

export interface BulkATSCandidateSummary {
  id: number;
  candidateName: string | null;
  emailOrCandidateId: string | null;
  finalScore: number | null;
  scoreBand: string | null;
  status: BulkATSCandidateStatus;
  needsReview: boolean;
  warnings: string[];
  confidenceScore: number | null;
  scoreLowerBound: number | null;
  scoreUpperBound: number | null;
  reviewerDecision: "shortlist" | "hold" | "not_shortlisted" | null;
  interviewOutcome:
    | "not_interviewed"
    | "interviewed"
    | "advanced"
    | "rejected"
    | "hired"
    | "withdrew"
    | null;
}

export interface BulkATSCandidateDetail extends BulkATSCandidateSummary {
  originalFilename: string | null;
  resumeUrl: string | null;
  errorMessage: string | null;
  deterministicReport: BulkATSDeterministicReport | null;
  jevReport: Record<string, { value: unknown; confidence: number | null; type: string }> | null;
  linkReport: Record<string, unknown> | null;
  reviewerNotes: string | null;
  decisionReason: string | null;
  outcomeRecordedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkATSCandidateList {
  total: number;
  candidates: BulkATSCandidateSummary[];
}

export interface BulkATSIngestResponse {
  accepted: Array<{ candidateId: number; filename?: string; queued: boolean }>;
  skipped: Array<{ filename?: string; reason: string }>;
}
