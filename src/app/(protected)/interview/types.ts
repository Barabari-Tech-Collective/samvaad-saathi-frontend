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
}

export interface StartQuestionAttemptResponse {
  questionAttemptId: number;
}

export interface FollowUpQuestion {
  interviewQuestionId: number;
  questionAttemptId: number;
  parentQuestionId: number;
  text: string;
  strategy: string;
}

export interface TranscribeResponse {
  followUpGenerated?: boolean;
  followUpQuestion?: FollowUpQuestion;
}
