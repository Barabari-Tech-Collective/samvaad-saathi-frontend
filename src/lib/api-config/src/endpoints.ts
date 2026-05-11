export const ENDPOINTS = {
  HEALTH_CHECK: "",
  AUTH: {
    ABOUT_ME: "me",
    COGNITO_LOGIN: "auth/cognito/login",
    COGNITO_REFRESH: "auth/cognito/refresh",
    COGNITO_LOGOUT: "auth/cognito/logout",
  },
  USERS: {
    PROFILE: "users/profile",
  },
  RESUME: {
    EXTRACT: "extract-resume",
  },
  TTS: {
    CONVERT: "tts/convert",
  },
  INTERVIEWS: {
    LIST: "interviews",
    CREATE: "interviews/create",
    GENERATE_QUESTIONS: "interviews/generate-questions",
    COMPLETE: "interviews/complete",
    QUESTIONS: (interviewId: string) => `interviews/${interviewId}/questions`,
    QUESTION_ATTEMPTS: (interviewId: string) =>
      `interviews/${interviewId}/question-attempts`,
    START_QUESTION_ATTEMPT: "interviews/question-attempts",
    WITH_SUMMARY: "interviews-with-summary",
    RESUME_INTERVIEW: `interviews/resume`,
  },
  TRANSCRIBE: {
    WHISPER: "transcribe-whisper",
  },
  ANALYSIS: {
    COMPLETE: "complete-analysis",
    FINAL_REPORT: "final-report",
    FETCH_REPORT: (interviewId: string) => `final-report/${interviewId}`,
    GENERATE_SUMMARY_REPORT: "summary-report",
    // GET_SUMMARY_REPORT: (interviewId: string) =>`summary-report/${interviewId}`,
  },
  PACING: {
    LEVELS: "pacing-practice/levels",
    SESSION_CREATE: "pacing-practice/session",
    SESSION_SUBMIT: (sessionId: string) =>
      `pacing-practice/session/${sessionId}/submit`,
    SESSION_GET: (sessionId: string) =>
      `pacing-practice/session/${sessionId}`,
  },
};

export const ENDPOINTS_V2 = {
  CREATE_INTERVIEW: "v2/interviews/create",
  GENERATE_QUESTIONS: "v2/interviews/generate-questions",
  GENERATE_NON_TECH_QUESTIONS: "v2/interviews/non-tech/generate-questions",
  JOB_PROFILES: "v2/job-profiles",
  SUPPLEMENTS: (interviewId: string) =>
    `v2/interviews/${interviewId}/supplements`,
  SUMMARY_REPORT: "v2/summary-report",
  CREATE_PRONUNCIATION_PRACTICE: "v2/pronunciation/create",
  GET_PRONUNCIATION_PRACTICE_AUDIO: (
    practiceId: string,
    questionNumber: number
  ) => `v2/pronunciation/${practiceId}/audio/${questionNumber}`,
  GENERATE_STRUCTURED_PRACTICE: "v2/structure-practice/session",
  SUBMIT_STRUCTURED_PRACTICE_AUDIO: (
    practiceId: string,
    questionIndex: number,
    sectionName: string
  ) =>
    `v2/structure-practice/${practiceId}/question/${questionIndex}/section/${sectionName}/submit`,
  ANALYSE_STRUCTURED_PRACTICE_AUDIO: (
    practiceId: string,
    questionIndex: number
  ) => `v2/structure-practice/${practiceId}/question/${questionIndex}/analyze`,
};
