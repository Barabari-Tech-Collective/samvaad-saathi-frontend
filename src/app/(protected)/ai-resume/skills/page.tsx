"use client";

import Link from "next/link";
import { SkillsAnalysisGroup } from "./_components/SkillsAnalysisGroup";
import { ProjectEvaluationList } from "./_components/ProjectEvaluationList";
import { ExperienceEvaluationList } from "./_components/ExperienceEvaluationList";
import { SuggestedProjectsWidget } from "./_components/SuggestedProjectsWidget";
import { useAIResumeContext } from "../_components/resume-provider";

export default function SkillsFeedbackPage() {
  // const { hasExperience } = useAIResumeContext();
  const { analysisResult } = useAIResumeContext();

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
        {/* Title Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Skills & Projects</h1>
          <p className="text-slate-600 text-sm">Where your resume shines and where to grow.</p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-8">
          <SkillsAnalysisGroup />
          <ProjectEvaluationList />
          {analysisResult?.experienceEvaluation && <ExperienceEvaluationList />}
          <SuggestedProjectsWidget />
        </div>

        <Link href="/ai-resume/hygiene" className="btn btn-neutral studio-wide-action">
          Continue
        </Link>
      </div>
    </div>
  );
}
