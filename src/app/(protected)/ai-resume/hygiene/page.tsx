"use client";

import {
  ChevronLeftIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { SparklesIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useAIResumeContext } from "../_components/resume-provider";
import { useGetTemplates } from "@/features/ai-resume/services/resumeBuilderService";
import { aiResumeService } from "@/features/ai-resume/services/aiResumeService";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ENDPOINTS } from "@/lib/api-config";
import { getTokenFromCookies } from "@/lib/token-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function HygieneAndTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [showProfileLinkInfo, setShowProfileLinkInfo] = useState(false);
  const {
    analysisResult,
    uploadedFile,
    formData,
    setAnalysisResult,
    setAnalysisId,
    setIsAnalyzing,
    setAnalysisError,
  } = useAIResumeContext();
  const { data: templates, isLoading: templatesLoading } = useGetTemplates();

  const hygiene = analysisResult?.hygieneCheck;
  const grammarIssues = hygiene?.grammarIssues ?? [];
  const recommendations = analysisResult?.finalRecommendations ?? [];
  const education = analysisResult?.educationEvaluation;

  const getLinkError = (keyword: string) => {
    const allLinks = analysisResult?.allLinks || [];
    const link = allLinks.find(
      (l) => !l.working && (l.type?.toLowerCase().includes(keyword) || l.url?.toLowerCase().includes(keyword))
    );
    return link?.error;
  };

  const getLinkNote = (keyword: string) => {
    const messages = hygiene?.linkFeedbackMessages || [];
    return messages.find(
      (msg) => msg.toLowerCase().startsWith("note:") && msg.toLowerCase().includes(keyword)
    );
  };

  const profileLinks = [
    { name: "LinkedIn Profile", valid: !!hygiene?.hasLinkedIn && hygiene?.linkedInWorking, error: getLinkError("linkedin"), note: getLinkNote("linkedin") },
    { name: "GitHub Profile", valid: !!hygiene?.hasGithub && hygiene?.githubWorking, error: getLinkError("github"), note: getLinkNote("github") },
    { name: "Portfolio Website", valid: !!hygiene?.hasPortfolio && hygiene?.portfolioWorking, error: getLinkError("portfolio"), note: getLinkNote("portfolio") },
    { name: "Phone Number", valid: !!hygiene?.hasPhone },
    { name: "Email Address", valid: !!hygiene?.hasEmail },
  ];

  const firstTemplate = templates?.[0];

  const handleSaveResume = async () => {
    if (!uploadedFile) {
      toast.error("No resume file found to save.");
      return;
    }

    try {
      setIsSaving(true);
      const formDataToSend = new FormData();
      formDataToSend.append("file", uploadedFile);

      const token = getTokenFromCookies();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      toast.loading("Saving resume to profile...", { id: "saving-resume" });
      const response = await fetch(`${baseUrl}/${ENDPOINTS.RESUME.SAVE_FINAL}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await response.json();
      toast.dismiss("saving-resume");

      if (!response.ok) {
        throw new Error(data.message || "Failed to save resume");
      }

      // Invalidate the /me query so the app immediately fetches the new ats_resume_filename and ats_resume_id
      await queryClient.invalidateQueries({ queryKey: [ENDPOINTS.AUTH.ABOUT_ME] });

      toast.success(
        "Resume safely stored in your Profile! To use this ATS resume for your AI interviews, go to your Profile page and click 'Replace with ATS Resume'.",
        { duration: 8000 }
      );
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save resume to profile.");
      toast.dismiss("saving-resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadReport = () => {
    try {
      if (!analysisResult) {
        toast.error("No analysis report data available");
        return;
      }

      const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Resume Analysis Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 800px; margin: 40px auto; padding: 30px; background: #f8fafc; }
                    .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; }
                    h2 { color: #1e293b; margin-top: 30px; font-size: 1.25rem; }
                    .score-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; font-size: 1.5rem; font-weight: bold; color: #166534; text-align: center; margin: 25px 0; }
                    .summary { background-color: #f1f5f9; padding: 20px; border-left: 4px solid #64748b; font-style: italic; border-radius: 0 8px 8px 0; }
                    .card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-top: 15px; }
                    .tag { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 0.85em; font-weight: 600; margin: 4px; }
                    .strong { background-color: #dcfce7; color: #166534; }
                    .missing { background-color: #fee2e2; color: #991b1b; }
                    .deprioritize { background-color: #ffedd5; color: #9a3412; }
                    .project-item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9; }
                    .project-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
                    .rating-badge { font-size: 0.7em; padding: 4px 10px; background: #e0f2fe; color: #0369a1; border-radius: 12px; vertical-align: middle; margin-left: 10px; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 8px; color: #475569; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>AI Resume Analysis Report</h1>
                    
                    <div class="score-box">
                        ATS Match Score: ${analysisResult.atsScore}/100
                    </div>

                    <div class="summary">
                        ${analysisResult.summary}
                    </div>

                    <h2>Skills Analysis</h2>
                    <div class="card">
                        <p style="margin-top:0; font-weight:bold;">Strong Skills:</p>
                        <div>${(analysisResult.skillsAnalysis?.strongSkills || []).map((s: string) => `<span class="tag strong">${s}</span>`).join("") || "None identified"}</div>
                        
                        <p style="margin-top: 20px; font-weight:bold;">Missing / Suggested Skills:</p>
                        <div>${(analysisResult.skillsAnalysis?.missingSkills || []).map((s: string) => `<span class="tag missing">${s}</span>`).join("") || "None identified"}</div>
                    </div>

                    <h2>Project Evaluation</h2>
                    <div class="card">
                        ${(analysisResult.projectEvaluation || [])
          .map(
            (p: any) => `
                            <div class="project-item">
                                <strong style="color: #0f172a;">${p.projectName}</strong>
                                <span class="rating-badge">Rating: ${p.rating}/5</span>
                                <p style="margin-top: 8px;">${p.feedback}</p>
                            </div>
                        `
          )
          .join("") ||
        '<p style="margin:0; color:#64748b;">No projects evaluated</p>'
        }
                    </div>

                    <h2>Final Recommendations</h2>
                    <div class="card">
                        <ul style="margin:0;">
                            ${(analysisResult.finalRecommendations || []).map((r: string) => `<li>${r}</li>`).join("") || "<li>No recommendations</li>"}
                        </ul>
                    </div>
                </div>
            </body>
            </html>
            `;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-analysis-report-${analysisResult.analysisId || "export"}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Analysis report downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download report");
    }
  };

  const handleReAnalyze = async () => {
    if (!uploadedFile) {
      toast.error("No resume file found. Please upload again.");
      router.push("/ai-resume");
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError(null);

      // Navigate to score page immediately to show loading state
      router.push("/ai-resume/score");

      const result = await aiResumeService.analyzeResume(
        uploadedFile,
        formData.targetRole,
        formData.experienceLevel,
        formData.jobDescription
      );

      setAnalysisResult(result);
      if (result.analysisId) {
        setAnalysisId(result.analysisId);
      }
      toast.success("Resume re-analyzed successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to re-analyze resume.";
      setAnalysisError(errorMessage);
      toast.error(errorMessage);
      console.error("Re-analyze error:", error);
    } finally {
      setIsAnalyzing(false);
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
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${grammarIssues.length > 0 ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"}`}
              >
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
              <p className="text-sm text-slate-500 italic">
                No grammar or spelling issues detected!
              </p>
            )}
          </div>

          {/* Profile Links Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">Profile links</h2>
                <div className="relative flex items-center group">
                  <button
                    onClick={() => setShowProfileLinkInfo(!showProfileLinkInfo)}
                    className="p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <InformationCircleIcon className="size-5 text-slate-400 hover:text-primary transition-colors" />
                  </button>
                  
                  {/* Custom CSS Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] shadow-lg">
                    Important details that student has to read
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              </div>
            </div>

            {showProfileLinkInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                  <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0 bg-white">
                    <h3 className="font-bold text-slate-900 text-lg">Profile Link Guidelines</h3>
                    <button
                      onClick={() => setShowProfileLinkInfo(false)}
                      className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  </div>

                  <div className="p-5 overflow-y-auto space-y-6 bg-slate-50 text-slate-700">
                    <div>
                      <p className="font-bold text-slate-900 text-base mb-2">1. 💼 LinkedIn Profile</p>
                      <p className="text-sm text-slate-700 mb-3">Please provide your direct LinkedIn profile link to showcase your professional experience.</p>
                      <div className="text-sm space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-medium text-green-700 mb-1">✅ Accepted Links:</p>
                          <ul className="list-disc list-inside text-slate-600 ml-1 space-y-1">
                            <li>Full, direct profile URLs (e.g., https://www.linkedin.com/in/your-profile-name)</li>
                            <li>Standard localized LinkedIn URLs (e.g., https://in.linkedin.com/in/your-profile)</li>
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <p className="font-medium text-red-700 mb-1">⚠️ Not Accepted (Will not be detected):</p>
                          <ul className="list-disc list-inside text-slate-600 ml-1 space-y-1">
                            <li>Links to LinkedIn company pages or job posts.</li>
                            <li>Just your name or username without the URL (e.g., @JohnDoe).</li>
                            <li>Shortened links (e.g., bit.ly/my-linkedin).</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 text-base mb-2">2. 💻 GitHub Profile</p>
                      <p className="text-sm text-slate-700 mb-3">Connect your GitHub to highlight your technical projects and contributions.</p>
                      <div className="text-sm space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-medium text-green-700 mb-1">✅ Accepted Links:</p>
                          <ul className="list-disc list-inside text-slate-600 ml-1 space-y-1">
                            <li>Direct user profile URLs (e.g., https://github.com/your-username)</li>
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <p className="font-medium text-red-700 mb-1">⚠️ Not Accepted (Will not be detected):</p>
                          <ul className="list-disc list-inside text-slate-600 ml-1 space-y-1">
                            <li>Links to specific repositories instead of your main profile (e.g., github.com/your-username/project-name).</li>
                            <li>Links to raw code files or GitHub pages (.github.io)—put GitHub Pages in the Portfolio section instead.</li>
                            <li>Just your GitHub username without the https://github.com/ prefix.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 text-base mb-2">3. 🌐 Portfolio / Linktree</p>
                      <p className="text-sm text-slate-700 mb-3">Share your personal website, portfolio, or a Linktree to show off your aggregated work.</p>
                      <div className="text-sm space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-medium text-green-700 mb-1">✅ Accepted Links:</p>
                          <ul className="list-disc list-inside text-slate-600 ml-1 space-y-1">
                            <li>Standard Linktree URLs (e.g., https://linktr.ee/your-name)</li>
                            <li>Direct links to your personal website (e.g., https://www.your-portfolio.com or https://your-name.github.io)</li>
                            <li>Links to other portfolio sites (e.g., Behance, Dribbble) that start with http:// or https://.</li>
                          </ul>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <p className="font-medium text-red-700 mb-1">⚠️ Not Accepted (Will not be detected):</p>
                          <ul className="list-disc list-inside text-slate-600 ml-1 space-y-1">
                            <li>Links missing the http:// or https:// prefix at the beginning.</li>
                            <li>Links to Google Drive folders or Dropbox files.</li>
                            <li>Social media accounts that are not professional portfolios (e.g., personal Instagram, Facebook, or X/Twitter accounts).</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {profileLinks.map((link, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{link.name}</span>
                    <div className="flex items-center gap-2">
                      {link.note && link.valid && (
                        <button
                          onClick={() => setExpandedNotes(prev => ({ ...prev, [link.name]: !prev[link.name] }))}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-medium border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          <InformationCircleIcon className="size-3" />
                          Note
                        </button>
                      )}
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
                  </div>
                  {link.error && !link.valid && (
                    <span className="text-xs text-red-500">{link.error}</span>
                  )}
                  {link.note && link.valid && expandedNotes[link.name] && (
                    <div className="mt-1 p-2 rounded-md bg-amber-50 text-amber-700 text-xs border border-amber-100 animate-in fade-in slide-in-from-top-1">
                      {link.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {hygiene?.linkFeedbackMessages && hygiene.linkFeedbackMessages.filter(msg => !profileLinks.some(l => l.note === msg)).length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {hygiene.linkFeedbackMessages
                  .filter(msg => !profileLinks.some(l => l.note === msg))
                  .map((msg, idx) => {
                    const isNote = msg.toLowerCase().startsWith("note:");
                    return (
                      <p
                        key={idx}
                        className={`text-xs flex items-start gap-1.5 ${isNote ? "text-amber-600 bg-amber-50 p-2 rounded-md" : "text-red-500"
                          }`}
                      >
                        {isNote ? (
                          <InformationCircleIcon className="size-4 mt-0 flex-shrink-0" />
                        ) : (
                          <XMarkIcon className="size-3.5 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={isNote ? "leading-tight" : ""}>{msg}</span>
                      </p>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Education Evaluation Card */}
          {education && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Education</h2>
                <span className="text-slate-400 text-xs">Academic Review</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">Institution</span>
                  <span
                    className={`font-medium ${education.hasInstitution ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {education.hasInstitution ? "✔ Present" : "✖ Missing"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">Duration</span>
                  <span
                    className={`font-medium ${education.hasDuration ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {education.hasDuration ? "✔ Present" : "✖ Missing"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">CGPA / Percentage</span>
                  <span
                    className={`font-medium ${education.hasScore ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {education.hasScore ? "✔ Present" : "✖ Missing"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">AI Feedback</h3>

                <p className="text-sm text-slate-600 leading-6">{education.feedback}</p>
              </div>
            </div>
          )}

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
                <p className="text-sm text-slate-500 italic">
                  No recommendations details available.
                </p>
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
                <span className="text-white text-[10px] font-medium uppercase tracking-wider">
                  ATS Optimized
                </span>
              </div>
              <div>
                <h3 className="text-white font-bold leading-tight">
                  {templatesLoading
                    ? "Loading templates..."
                    : firstTemplate
                      ? firstTemplate.name
                      : "ATS-friendly resume template"}
                </h3>
                <p className="text-white/70 text-xs mt-1">
                  {firstTemplate?.description ||
                    "Professionally structured for ATS systems and modern recruiters."}
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
                  href={`/ai-resume/final?templateId=${firstTemplate?.templateId || "default"}`}
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
          <button
            onClick={handleSaveResume}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <DocumentCheckIcon className="size-4" />
            )}
            Save Resume
          </button>
          <button
            onClick={handleReAnalyze}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
          >
            <ArrowPathIcon className="size-4" />
            Re-Analyze
          </button>
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
