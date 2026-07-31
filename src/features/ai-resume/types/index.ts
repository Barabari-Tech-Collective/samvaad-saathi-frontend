/**
 * Type definitions for AI Resume and Resume Builder features matching backend API responses
 */

export interface ScoreBreakdown {
  skillsMatch?: number;
  experienceMatch?: number;
  linkIntegrity?: number;
  educationScore?: number;
}

export interface SkillsAnalysis {
  strongSkills?: string[];
  missingSkills?: string[];
  additionalSkills?: string[];
}

export interface ExperienceEvaluation {
  rating: string;
  feedback: string;
}

export interface EducationEvaluation {
  hasInstitution: boolean;
  hasDuration: boolean;
  hasScore: boolean;
  feedback: string;
}

export interface ProjectEvaluationItem {
  projectName: string;
  rating: string;
  feedback: string;
  projectUrl?: string;
}

export interface SuggestedProject {
  title: string;
  description: string;
  difficulty?: string;
  tags?: string[];
}

export interface HygieneCheck {
  linkedinWorking: boolean;
  githubWorking: boolean;
  portfolioWorking: boolean;
  grammarIssues?: string[];
  hasLinkedIn: boolean;
  hasGithub: boolean;
  hasPortfolio: boolean;
  hasInstitution?: boolean;
  hasDuration?: boolean;
  hasScore?: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
}

export interface AnalysisResult {
  atsScore: number;
  summary: string;
  scoreBreakdown: ScoreBreakdown;
  skillsAnalysis: SkillsAnalysis;
  experienceEvaluation?: ExperienceEvaluation;
  educationEvaluation?: EducationEvaluation;
  projectEvaluation?: ProjectEvaluationItem[];
  suggestedProject?: SuggestedProject;
  finalRecommendations?: string[];
  hygieneCheck?: HygieneCheck;
  analysisId: string;
}

export interface TemplateSection {
  id: string;
  name: string;
}

export interface TemplateData {
  templateId: string;
  name: string;
  description?: string;
  previewImage?: string;
  tags?: string[];
  sections?: string[] | TemplateSection[];
}

export interface TemplateDetailData {
  templateId: string;
  name: string;
  structure: {
    sections: string[] | TemplateSection[];
  };
  sampleData: {
    header?: any;
    summary?: string;
    skills?: string[];
    experience?: any[];
    projects?: any[];
    education?: any[];
  };
}

export interface ResumeData {
  resumeId: string;
  userId: string;
  templateId: string;
  data: Record<string, any>;
  status: string;
  updatedAt: string;
}
