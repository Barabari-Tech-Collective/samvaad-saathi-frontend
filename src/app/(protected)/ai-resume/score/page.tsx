"use client";

import Link from "next/link";
import { ATSScoreCircle } from "./_components/ATSScoreCircle";
import { ScoreBreakdownGrid } from "./_components/ScoreBreakdownGrid";
import { TopRecommendationsCard } from "./_components/TopRecommendationsCard";
import { useAIResumeContext } from "../_components/resume-provider";

export default function ATSDashboardPage() {
  const { formData } = useAIResumeContext();

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
        {/* Title Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">ATS Score</h1>
          <p className="text-slate-600 text-sm">
            Analyzed for {formData?.targetRole || "Target Role"} -{" "}
            {formData?.experienceLevel || "Level"}
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6">
          <ATSScoreCircle />
          <ScoreBreakdownGrid />
          <TopRecommendationsCard />
        </div>

        <Link href="/ai-resume/skills" className="btn btn-neutral studio-wide-action">
          View Detailed Feedback
        </Link>
      </div>
    </div>
  );
}
