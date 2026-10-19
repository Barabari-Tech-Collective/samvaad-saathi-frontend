export interface GenerateQuestionsResponse {
  plannedQuestionCount?: number | null;
  interviewId: number;
  track: string;
  count: number;
  questions: string[];
  questionIds: number[];
  items: {
    interviewQuestionId: number;
    text: string;
    topic: string;
    difficulty: string | null;
    category: string;
    isFollowUp: boolean;
    parentQuestionId: number | null;
    followUpStrategy: string | null;
    questionAttemptId?: number | null;
    answerSaved?: boolean;
    answerVersion?: number;
    answerKind?: "audio" | "text" | null;
    transcriptionStatus?: "pending" | "processing" | "transcribed" | "failed" | null;
    attemptState?: "in_progress" | "answer_saved" | "skipped" | null;
    skipped?: boolean;
    followUpDisposition?:
      | "pending"
      | "generated"
      | "not_generated"
      | "not_applicable"
      | "skipped"
      | null;
    audioUrl?: string;
    supplement: {
      content: string;
      format: string;
      questionId: string;
      supplementType: string;
    } | null;
  }[];
  cached: boolean;
  llmModel: string | null;
  llmLatencyMs: number | null;
  llmError: string | null;
  interviewMode?: "practice" | "assessment";
}

export interface StartQuestionAttemptResponse {
  questionAttemptId: number;
  created?: boolean;
  stateVersion: number;
  currentQuestionId: number | null;
}

export type AdvanceInterviewAction = "answer_saved" | "skip" | "continue_without_follow_up";

export interface PracticeNavigationResponse {
  plannedQuestionCount?: number | null;
  interviewId: number;
  status: string;
  stateVersion: number;
  questionSetVersion: number;
  currentQuestionId: number | null;
  currentQuestionIndex: number | null;
  completeReady: boolean;
  duplicate: boolean;
  questions: GenerateQuestionsResponse["items"];
}

export interface ResumeInterviewResponse {
  plannedQuestionCount?: number | null;
  answerDeadlineAt?: string | null;
  startedAt?: string | null;
  interviewId: number;
  track: string;
  difficulty: string;
  questions: GenerateQuestionsResponse["items"];
  totalQuestions: number;
  attemptedQuestions: number;
  remainingQuestions: number;
  answeredQuestions: number;
  resumeQuestionIndex: number | null;
  stateVersion: number;
  questionSetVersion: number;
  currentQuestionId: number | null;
  currentQuestionIndex: number | null;
  completeReady: boolean;
  status: string;
  interviewMode?: "practice" | "assessment";
}

export interface InterviewSessionLeaseResponse {
  interviewId: number;
  leaseToken: string;
  leaseExpiresAt: string;
  state: "acquired" | "renewed" | "taken_over";
}

export interface FollowUpQuestion {
  interviewQuestionId: number;
  questionAttemptId: number;
  parentQuestionId: number;
  text: string;
  strategy: string;
}

export interface TranscribeResponse {
  saved: boolean;
  questionAttemptId: number;
  followUpGenerated?: boolean;
  followUpQuestion?: FollowUpQuestion;
  answerVersion?: number;
  transcriptionStatus?: "pending" | "processing" | "transcribed" | "failed";
}

export interface TranscriptionStatusResponse {
  questionAttemptId: number;
  status: "pending" | "processing" | "transcribed" | "failed";
  isTerminal: boolean;
  saved: boolean;
  answerVersion: number;
  transcription?: { text?: string; language?: string } | null;
  wordCount?: number | null;
  error?: string | null;
  evidenceStatus?: "usable" | "unavailable" | null;
  evidenceReason?: string | null;
  retryable?: boolean;
  followUpQuestion?: FollowUpQuestion | null;
  updatedAt?: string | null;
}
