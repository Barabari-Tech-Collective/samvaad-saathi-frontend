/**
 * Type definitions for AI Resume and Resume Builder features
 */

export interface AnalysisBreakdown {
  skills?: number;
  experience?: number;
  formatting?: number;
  keywords?: number;
  [key: string]: number | undefined;
}

export interface SkillsAnalysis {
  strong?: string[];
  missing?: string[];
  deprioritize?: string[];
}

export interface ExperienceItem {
  title: string;
  status: "Good" | "Average" | "Excellent" | "Poor";
  description: string;
}

export interface ProjectItem {
  title: string;
  status: "Good" | "Average" | "Excellent" | "Poor";
  description: string;
}

export interface SuggestedProject {
  title: string;
  description: string;
  tags?: string[];
}

export interface AnalysisResult {
  id?: string;
  score: number;
  breakdown: AnalysisBreakdown;
  recommendations: string[];
  skillsAnalysis: SkillsAnalysis;
  hasExperience: boolean;
  experience?: ExperienceItem[];
  projects?: ProjectItem[];
  suggestedProject?: SuggestedProject;
}

export interface TemplateData {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
}

export interface ResumeData {
  id: string;
  templateId: string;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
