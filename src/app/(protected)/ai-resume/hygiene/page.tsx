"use client";

import { ChevronLeftIcon, CheckIcon, XMarkIcon, ArrowPathIcon, DocumentTextIcon, EyeIcon, ArrowDownTrayIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useAIResumeContext } from "../_components/resume-provider";
import { useGetTemplates } from "@/features/ai-resume/services/resumeBuilderService";
import toast from "react-hot-toast";

export default function HygieneAndTemplatePage() {
    const { analysisResult } = useAIResumeContext();
    const { data: templates, isLoading: templatesLoading } = useGetTemplates();

    const hygiene = analysisResult?.hygieneCheck;
    const grammarIssues = hygiene?.grammarIssues ?? [];
    const recommendations = analysisResult?.finalRecommendations ?? [];

    const profileLinks = [
        { name: "LinkedIn Profile", valid: !!hygiene?.hasLinkedIn },
        { name: "GitHub Profile", valid: !!hygiene?.hasGithub },
        { name: "Portfolio Website", valid: !!hygiene?.hasPortfolio },
        { name: "Phone Number", valid: !!hygiene?.hasPhone },
        { name: "Email Address", valid: !!hygiene?.hasEmail },
    ];

    const firstTemplate = templates?.[0];

    const handleDownloadReport = () => {
        // Download report mock/handler as blob or simple JSON text file
        try {
            if (!analysisResult) {
                toast.error("No analysis report data available");
                return;
            }
            const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: "application/json" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `resume-analysis-report-${analysisResult.analysisId || "export"}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Analysis report downloaded successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to download report");
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto pb-20">
            <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link 
                        href="/ai-resume/skills"
                        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <ChevronLeftIcon className="size-5 text-slate-700" />
                    </Link>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-full text-sm font-medium">
                        <SparklesIcon className="size-4" />
                        <span>AI Powered</span>
                    </div>
                </div>

                {/* Title Section */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900">Hygiene & Template</h1>
                    <p className="text-slate-500 text-sm">Final polish and an ATS-ready template.</p>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-4">
                    {/* Grammar & Spelling Card */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Grammar & spelling</h2>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${grammarIssues.length > 0 ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"}`}>
                                {grammarIssues.length} {grammarIssues.length === 1 ? "issue" : "issues"}
                            </span>
                        </div>
                        {grammarIssues.length > 0 ? (
                            <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                                {grammarIssues.map((issue, idx) => (
                                    <li key={idx}>{issue}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No grammar or spelling issues detected!</p>
                        )}
                    </div>

                    {/* Profile Links Card */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Profile links</h2>
                            <span className="text-slate-400 text-xs">Developer track</span>
                        </div>
                        <div className="space-y-3">
                            {profileLinks.map((link, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-700">{link.name}</span>
                                    {link.valid ? (
                                        <div className="size-5 rounded-full bg-green-50 flex items-center justify-center">
                                            <CheckIcon className="size-3 text-green-500" />
                                        </div>
                                    ) : (
                                        <div className="size-5 rounded-full bg-red-50 flex items-center justify-center">
                                            <XMarkIcon className="size-3 text-red-500" strokeWidth={2} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Final Recommendations Card */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                        <h2 className="font-semibold text-slate-900">Final recommendations</h2>
                        <div className="space-y-3">
                            {recommendations.length > 0 ? (
                                recommendations.map((rec, idx) => (
                                    <div key={idx} className="flex gap-3 text-sm text-slate-600">
                                        <div className="mt-0.5 size-4 rounded-full bg-primary/5 flex-shrink-0 flex items-center justify-center">
                                            <CheckIcon className="size-2.5 text-primary" strokeWidth={3} />
                                        </div>
                                        <span>{rec}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 italic">No recommendations details available.</p>
                            )}
                        </div>
                    </div>

                    {/* ATS Template Card */}
                    <div className="bg-primary rounded-2xl p-5 shadow-md flex flex-col sm:flex-row gap-5 items-start">
                        {/* Resume Visual */}
                        <div className="bg-white rounded-lg p-3 w-24 h-32 flex-shrink-0 flex flex-col gap-2 shadow-sm mx-auto sm:mx-0">
                            <div className="h-2 w-3/4 bg-slate-200 rounded-full mx-auto mb-1"></div>
                            <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                            <div className="h-1 w-5/6 bg-slate-100 rounded-full"></div>
                            <div className="h-1.5 w-1/2 bg-slate-300 rounded-full mt-2"></div>
                            <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                            <div className="h-1 w-4/5 bg-slate-100 rounded-full"></div>
                            <div className="h-1.5 w-1/2 bg-slate-300 rounded-full mt-1"></div>
                            <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                            <div className="h-1 w-full bg-slate-100 rounded-full"></div>
                        </div>
                        
                        {/* Template Info & Actions */}
                        <div className="flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 w-fit rounded-full">
                                <DocumentTextIcon className="size-3 text-white" />
                                <span className="text-white text-[10px] font-medium uppercase tracking-wider">ATS Optimized</span>
                            </div>
                            <div>
                                <h3 className="text-white font-bold leading-tight">
                                    {templatesLoading ? "Loading templates..." : firstTemplate ? firstTemplate.name : "ATS-friendly resume template"}
                                </h3>
                                <p className="text-white/70 text-xs mt-1">
                                    {firstTemplate?.description || "Professionally structured for ATS systems and modern recruiters."}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <Link 
                                    href={`/ai-resume/preview?templateId=${firstTemplate?.templateId || "default"}`}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white text-xs font-medium"
                                >
                                    <EyeIcon className="size-3.5" />
                                    Preview
                                </Link>
                                <Link 
                                    href={`/ai-resume/preview?templateId=${firstTemplate?.templateId || "default"}`}
                                    className="flex items-center gap-1 px-4 py-1.5 bg-white hover:bg-slate-50 transition-colors rounded-lg text-primary text-xs font-semibold ml-auto"
                                >
                                    Use
                                    <ArrowRightIcon className="size-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-3 mt-4">
                    <Link 
                        href="/ai-resume"
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                    >
                        <ArrowPathIcon className="size-4" />
                        Re-Analyze
                    </Link>
                    <button 
                        onClick={handleDownloadReport}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary hover:opacity-90 text-white rounded-xl font-medium transition-colors shadow-sm"
                    >
                        <DocumentTextIcon className="size-4" />
                        Download Report
                    </button>
                </div>
            </div>
        </div>
    );
}
