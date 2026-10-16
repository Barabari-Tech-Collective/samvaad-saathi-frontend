export interface GenerateQuestionsResponse {
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
  followUpQuestion?: FollowUpQuestion | null;
  updatedAt?: string | null;
}

export interface TextAnswerResponse {
  saved: boolean;
  questionAttemptId: number;
  answerVersion: number;
  transcriptionStatus: "transcribed";
}
