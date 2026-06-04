"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { AnalysisResult } from "@/features/ai-resume/types";

interface AIResumeContextType {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  hasExperience: boolean;
  setHasExperience: (hasExperience: boolean) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  analysisId: string | null;
  setAnalysisId: (id: string | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  analysisError: string | null;
  setAnalysisError: (error: string | null) => void;
}

const AIResumeContext = createContext<AIResumeContextType | undefined>(undefined);

export function AIResumeProvider({ children }: { children: ReactNode }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [hasExperience, setHasExperience] = useState<boolean>(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  return (
    <AIResumeContext.Provider
      value={{
        uploadedFile,
        setUploadedFile,
        hasExperience,
        setHasExperience,
        analysisResult,
        setAnalysisResult,
        analysisId,
        setAnalysisId,
        isAnalyzing,
        setIsAnalyzing,
        analysisError,
        setAnalysisError,
      }}
    >
      {children}
    </AIResumeContext.Provider>
  );
}

export function useAIResumeContext() {
  const context = useContext(AIResumeContext);
  if (context === undefined) {
    throw new Error("useAIResumeContext must be used within an AIResumeProvider");
  }
  return context;
}
