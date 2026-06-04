"use client";

import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { ATSScoreCircle } from "./_components/ATSScoreCircle";
import { ScoreBreakdownGrid } from "./_components/ScoreBreakdownGrid";
import { TopRecommendationsCard } from "./_components/TopRecommendationsCard";

export default function ATSDashboardPage() {
    const router = useRouter();

    return (
        <div className="w-full max-w-2xl mx-auto pb-20">
            <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => router.push("/ai-resume")}
                        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <ChevronLeftIcon className="size-5 text-slate-700" />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-full text-sm font-medium">
                        <SparklesIcon className="size-4" />
                        <span>AI Powered</span>
                    </div>
                </div>

                {/* Title Section */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900">ATS Score</h1>
                    <p className="text-slate-500 text-sm">Analyzed for Frontend Developer - Entry Level</p>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-6">
                    <ATSScoreCircle />
                    <ScoreBreakdownGrid />
                    <TopRecommendationsCard />
                </div>

                <button 
                    onClick={() => router.push("/ai-resume/skills")}
                    className="mt-2 w-full py-4 bg-primary hover:opacity-90 text-white rounded-2xl font-medium transition-colors shadow-sm active:scale-[0.98]"
                >
                    View Detailed Feedback
                </button>
            </div>
        </div>
    );
}
