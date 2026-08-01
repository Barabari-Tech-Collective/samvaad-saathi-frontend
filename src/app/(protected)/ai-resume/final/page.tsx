"use client";

import {
  ChevronLeftIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  BookmarkSquareIcon,
} from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAIResumeContext } from "../_components/resume-provider";
import { useEffect, useState, Suspense } from "react";
import {
  useCreateFromTemplate,
  useUpdateResume,
  useSyncResumeToProfile,
} from "@/features/ai-resume/services/resumeBuilderService";
import { getTokenFromCookies } from "@/lib/token-utils";
import axios from "axios";
import { ENDPOINTS } from "@/lib/api-config";
import toast from "react-hot-toast";
import ResumeEditorForm from "./_components/ResumeEditorForm";

function ResumeTemplateFullViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId") || "";

  const { uploadedFile, analysisId } = useAIResumeContext();
  const { mutateAsync: createFromTemplate, isPending: isCreating } = useCreateFromTemplate();

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const updateResumeMutation = useUpdateResume(resumeId || "");
  const syncResumeMutation = useSyncResumeToProfile(resumeId || "");

  useEffect(() => {
    // Redirect if someone visits this URL directly without uploading
    if (!uploadedFile) {
      router.replace("/ai-resume");
      return;
    }

    if (templateId) {
      createFromTemplate({
        templateId,
        analysisId: analysisId || undefined,
      })
        .then((res) => {
          setResumeId(res.resumeId);
          setResumeData(res.data);
        })
        .catch((err) => {
          console.error("Failed to create resume:", err);
          setCreateError(err.message || "Failed to generate resume from template.");
          toast.error("Error creating resume from template.");
        });
    }
  }, [uploadedFile, templateId, analysisId, createFromTemplate, router]);

  const handleDownload = async () => {
    if (!resumeId) {
      toast.error("Resume has not been generated yet.");
      return;
    }

    try {
      setIsDownloading(true);
      const token = getTokenFromCookies();
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await axios.get(
        `${baseUrl}/${ENDPOINTS.RESUME_BUILDER.GET_DOWNLOAD(resumeId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create download link for the blob file response
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resume-${resumeId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Resume downloaded successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download resume.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSync = () => {
    if (!resumeId) return;
    syncResumeMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Resume saved to your profile! You can now use it for interviews.");
      },
      onError: () => {
        toast.error("Failed to save resume to profile.");
      },
    });
  };

  if (!uploadedFile) return null;

  if (isCreating) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-slate-500 font-medium text-sm">
          Generating your resume from template...
        </p>
      </div>
    );
  }

  if (createError) {
    return (
      <div className="w-full text-center py-20 space-y-4">
        <p className="text-red-500 font-semibold">{createError}</p>
        <Link
          href="/ai-resume/hygiene"
          className="inline-block px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold"
        >
          Back to Templates
        </Link>
      </div>
    );
  }

  // Fallback to sample data values if resumeData fields are empty
  const header = resumeData?.header || {
    name: "ANANYA SHARMA",
    title: "Digital Marketing Professional",
    email: "ananya.sharma@email.com",
    phone: "+91 98765 43210",
    location: "Delhi, India",
    linkedin: "linkedin.com/in/ananyasharma",
  };

  const summary =
    resumeData?.summary ||
    "Entry-level Digital Marketing professional with hands-on experience in SEO, campaign strategy, and performance analysis through real-world projects. Proficient in Google Analytics, social media marketing, and data-driven decision making.";

  const skills = resumeData?.skills || [
    "SEO",
    "Content Strategy",
    "Campaign Analysis",
    "Canva",
    "Performance Marketing",
    "Social Media Marketing",
    "Google Analytics",
  ];

  const experience = resumeData?.experience || [
    {
      title: "Marketing Intern",
      duration: "Jan 2024 - Aug 2024",
      company: "TechStartups (Remote)",
      bullets: [
        "Managed social media calendar across 3 platforms",
        "Conducted competitor SEO audits",
        "Assisted in launching paid campaigns",
      ],
    },
  ];

  const projects = resumeData?.projects || [
    {
      title: "E-Commerce SEO Optimization Strategy",
      duration: "Jan 2024 - Feb 2024",
      bullets: [
        "Improved keyword rankings",
        "Increased traffic visibility",
        "Built optimization reports",
      ],
    },
    {
      title: "Social Media Campaign for SaaS Product Launch",
      duration: "Nov 2023 - Dec 2023",
      bullets: [
        "Developed launch strategy",
        "Managed influencer campaigns",
        "Built analytics dashboard",
      ],
    },
  ];

  const education = resumeData?.education || [
    {
      degree: "B.Com in Marketing",
      institution: "Delhi University",
      duration: "2021 - 2024",
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/ai-resume/hygiene"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ChevronLeftIcon className="size-5 text-slate-700" />
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-full text-sm font-medium">
            <ShieldCheckIcon className="size-4" />
            <span>ATS Optimized</span>
          </div>
        </div>

        {/* Title Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">ATS Resume Template</h1>
          <p className="text-slate-500 text-sm">Professional ATS-friendly resume format.</p>
        </div>

        {isEditing ? (
          <ResumeEditorForm
            initialData={resumeData}
            isSaving={updateResumeMutation.isPending}
            onCancel={() => setIsEditing(false)}
            onSave={(newData) => {
              if (!resumeId) return;
              updateResumeMutation.mutate(
                { data: newData },
                {
                  onSuccess: () => {
                    setResumeData(newData);
                    setIsEditing(false);
                    toast.success("Resume updated successfully!");
                  },
                  onError: () => {
                    toast.error("Failed to save changes.");
                  },
                }
              );
            }}
          />
        ) : (
          <>
            {/* Resume Preview Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              {/* Preview Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-slate-700">Full resume preview</span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">
                  A4 | 1 page
                </span>
              </div>

              {/* Actual Resume Content Mockup */}
              <div className="flex flex-col text-[11px] leading-relaxed text-slate-800 font-sans px-2">
                {/* Header */}
                <div className="text-center pb-3">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-wide uppercase">
                    {header.fullName || header.name}
                  </h2>
                  {header.title && <p className="text-sm text-slate-700 mt-1">{header.title}</p>}
                  <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-slate-500 mt-2 text-[10px]">
                    {header.email && (
                      <span className="flex items-center gap-1">✉ {header.email}</span>
                    )}
                    {header.phone && (
                      <span className="flex items-center gap-1">📞 {header.phone}</span>
                    )}
                    {header.location && (
                      <span className="flex items-center gap-1">📍 {header.location}</span>
                    )}
                    {header.linkedin && (
                      <span className="flex items-center gap-1">🔗 {header.linkedin}</span>
                    )}
                    {header.github && (
                      <span className="flex items-center gap-1">💻 {header.github}</span>
                    )}
                  </div>
                </div>

                {/* Objective */}
                {summary && (
                  <div className="mb-3">
                    <h3 className="font-bold text-[11px] tracking-wider text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">
                      Career Objective
                    </h3>
                    <p className="text-slate-700 leading-relaxed text-[11px] text-justify">
                      {summary}
                    </p>
                  </div>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                  <div className="mb-3">
                    <h3 className="font-bold text-[11px] tracking-wider text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">
                      Work Experience
                    </h3>
                    <div className="space-y-3">
                      {experience.map((exp: any, idx: number) => (
                        <div key={idx}>
                          <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                            <span>{exp.role || exp.title}</span>
                            <span className="font-normal text-slate-600">{exp.duration}</span>
                          </div>
                          {exp.company && (
                            <div className="text-slate-700 italic text-[11px] mb-1">
                              {exp.company}
                            </div>
                          )}
                          {(exp.highlights || exp.bullets || []).length > 0 && (
                            <ul className="list-disc text-slate-700 text-[11px] ml-4 space-y-1 text-justify">
                              {(exp.highlights || exp.bullets).map(
                                (bullet: string, bIdx: number) => (
                                  <li key={bIdx} className="pl-1">
                                    {bullet}
                                  </li>
                                )
                              )}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                        {/* Projects */}
                        {projects.length > 0 && (
                            <div className="mb-3">
                                <h3 className="font-bold text-[11px] tracking-wider text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Projects</h3>
                                <div className="space-y-3">
                                    {projects.map((proj: any, idx: number) => (
                                        <div key={idx}>
                                            <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                                                <span>{proj.title}</span>
                                                <span className="font-normal text-slate-600">{proj.duration || ""}</span>
                                            </div>
                                            {(proj.highlights || proj.bullets || []).length > 0 && (
                                                <ul className="list-disc text-slate-700 text-[11px] ml-4 space-y-1 text-justify mt-1">
                                                    {(proj.highlights || proj.bullets).map((bullet: string, bIdx: number) => (
                                                        <li key={bIdx} className="pl-1">{bullet}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {(!proj.highlights && !proj.bullets && proj.description) && (
                                                <p className="text-slate-700 text-[11px] text-justify mt-1">{proj.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="mb-3">
                    <h3 className="font-bold text-[11px] tracking-wider text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">
                      Skills
                    </h3>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {skills.join(" • ")}
                    </p>
                  </div>
                )}

                {/* Education */}
                {education.length > 0 && (
                  <div className="mb-2">
                    <h3 className="font-bold text-[11px] tracking-wider text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">
                      Education
                    </h3>
                    <div className="space-y-2">
                      {education.map((edu: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-900 text-[11px]">{edu.degree}</div>
                            <div className="text-slate-600 text-[11px]">
                              {edu.year || edu.duration}
                            </div>
                          </div>
                          <span className="font-normal text-slate-600 text-[11px] text-right">
                            {edu.institution}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleSync}
                disabled={syncResumeMutation.isPending || !resumeId}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                <BookmarkSquareIcon className="size-4" strokeWidth={3} />
                {syncResumeMutation.isPending ? "Saving..." : "Save Resume"}
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-medium transition-colors"
              >
                <ArrowDownTrayIcon className="size-4" />
                {isDownloading ? "Downloading..." : "Download PDF"}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary hover:opacity-90 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                <PencilSquareIcon className="size-4" strokeWidth={3} />
                Edit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResumeTemplateFullViewPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex flex-col items-center justify-center py-20 gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-slate-500 font-medium text-sm">Loading resume template view...</p>
        </div>
      }
    >
      <ResumeTemplateFullViewContent />
    </Suspense>
  );
}