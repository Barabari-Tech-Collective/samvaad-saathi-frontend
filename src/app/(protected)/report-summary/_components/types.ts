// API Response Types
export interface ReportResponse {
  reportId: string;
  candidateInfo: {
    name: string;
    interviewDate: string;
    roleTopic: string;
    duration: string;
    durationFeedback: string;
  };
  scoreSummary: {
    knowledgeCompetence: {
      score: number;
      maxScore: number;
      average: number;
      maxAverage: number;
      percentage: number;
      criteria: {
        accuracy: number;
        depth: number;
        relevance: number;
        examples: number;
        terminology: number;
      };
    };
    speechAndStructure: {
      score: number;
      maxScore: number;
      average: number;
      maxAverage: number;
      percentage: number;
      criteria: {
        fluency: number;
        structure: number;
        pacing: number;
        grammar: number;
      };
    };
  };
  questionAnalysis: Array<{
    id: number;
    totalQuestions: number;
    type: string;
    question: string;
    feedback: {
      strengths: string;
      areasOfImprovement: string;
    } | null;
  }>;
  recommendedPractice: {
    title: string;
    description: string;
  };
  speechFluencyFeedback: {
    strengths: string;
    areasOfImprovement: string;
    ratingEmoji: string;
    ratingTitle: string;
    ratingDescription: string;
  };
  nextSteps: Array<{
    title: string;
  }>;
  finalTip: {
    title: string;
    description: string;
  };
}

export type OverallScoreSummaryProps = {
  knowledgeCompetence: ReportResponse["scoreSummary"]["knowledgeCompetence"];
  speechAndStructure: ReportResponse["scoreSummary"]["speechAndStructure"];
  track?: string;
};

export type FinalSummaryProps = {
  speechFluencyFeedback: ReportResponse["speechFluencyFeedback"];
};

export type PerQuestionAnalysisProps = {
  questionAnalysis: ReportResponse["questionAnalysis"];
};
