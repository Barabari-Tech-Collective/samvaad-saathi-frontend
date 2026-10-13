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

export interface TextAnswerResponse {
  saved: boolean;
  questionAttemptId: number;
  answerVersion: number;
  transcriptionStatus: "transcribed";
}
