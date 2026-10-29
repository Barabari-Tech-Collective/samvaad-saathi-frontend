"use client";

import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  BookmarkSquareIcon,
} from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAIResumeContext } from "../_components/resume-provider";
import { useEffect, useRef, useState, Suspense } from "react";
import {
  useCreateFromTemplate,
  useUpdateResume,
} from "@/features/ai-resume/services/resumeBuilderService";
import {
  getResumePdf,
  saveResumePdfToProfile,
} from "@/features/ai-resume/services/resumeDocumentService";
import { ENDPOINTS } from "@/lib/api-config";
import { assertAuthRevision, getAuthRevision, SessionChangedError } from "@/lib/auth-session";
import toast from "react-hot-toast";
import ResumeEditorForm from "./_components/ResumeEditorForm";
import { useQueryClient } from "@tanstack/react-query";

interface ResumePreviewData {
  header?: Record<string, string>;
  summary?: string;
  skills?: string[];
  experience?: { role?: string; title?: string; duration?: string; company?: string; highlights?: string[]; bullets?: string[] }[];
  projects?: { title?: string; duration?: string; highlights?: string[]; bullets?: string[]; description?: string }[];
  education?: { degree?: string; year?: string; duration?: string; institution?: string }[];
}

function ResumeTemplateFullViewContent() {
  const ownerRevision = useRef(getAuthRevision()).current;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const templateId = searchParams.get("templateId") || "";

  const { uploadedFile, analysisId } = useAIResumeContext();
  const { mutateAsync: createFromTemplate, isPending: isCreating } = useCreateFromTemplate();

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<ResumePreviewData | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);

  const updateResumeMutation = useUpdateResume(resumeId || "");
  const saveInFlight = useRef(false);
  const downloadInFlight = useRef(false);
  const [documentError, setDocumentError] = useState("");

  useEffect(() => {
    let active = true;
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
          if (!active || getAuthRevision() !== ownerRevision) return;
          setResumeId(res.resumeId);
          setResumeData(res.data);
        })
        .catch((err) => {
          if (!active || getAuthRevision() !== ownerRevision) return;
          setCreateError(err.message || "Failed to generate resume from template.");
          toast.error("Error creating resume from template.");
        });
    }
    return () => {
      active = false;
    };
  }, [uploadedFile, templateId, analysisId, createFromTemplate, router, ownerRevision]);

  const handleDownload = async () => {
    if (downloadInFlight.current || saveInFlight.current) return;
    if (!resumeId) {
      toast.error("Resume has not been generated yet.");
      return;
    }

    try {
      assertAuthRevision(ownerRevision);
      downloadInFlight.current = true;
      setDocumentError("");
      setIsDownloading(true);
      const blob = await getResumePdf(resumeId, ownerRevision);
      assertAuthRevision(ownerRevision);
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
      if (error instanceof SessionChangedError || getAuthRevision() !== ownerRevision) return;
      setDocumentError("Could not download your resume. Please try again.");
      toast.error("Failed to download resume.");
    } finally {
      downloadInFlight.current = false;
      setIsDownloading(false);
    }
  };

  const handleSync = async () => {
    if (
      !resumeId ||
      saveInFlight.current ||
      downloadInFlight.current ||
      isEditing ||
      updateResumeMutation.isPending
    )
      return;
    saveInFlight.current = true;
    setIsSavingResume(true);
    setDocumentError("");
    try {
      assertAuthRevision(ownerRevision);
      toast.loading("Preparing your resume PDF…", { id: `saving-resume-${ownerRevision}` });
      const pdf = await getResumePdf(resumeId, ownerRevision);
      assertAuthRevision(ownerRevision);
      toast.loading("Saving resume to profile…", { id: `saving-resume-${ownerRevision}` });
      await saveResumePdfToProfile(pdf, ownerRevision);
      assertAuthRevision(ownerRevision);
      // A cache refresh failure must not misreport an acknowledged save as failed.
      void queryClient.invalidateQueries({ queryKey: [ENDPOINTS.AUTH.ABOUT_ME] }).catch(() => {});
      router.refresh();
      toast.success("Resume saved to your profile. You can choose it for interviews from Profile.");
    } catch (error) {
      if (error instanceof SessionChangedError || getAuthRevision() !== ownerRevision) return;
      setDocumentError(
        "Could not save your resume. Your draft is still here. Check your connection and try again."
      );
      toast.error("Could not save resume to profile.");
    } finally {
      toast.dismiss(`saving-resume-${ownerRevision}`);
      saveInFlight.current = false;
      setIsSavingResume(false);
    }
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

  if (!resumeData || !resumeId) return <p role="status">Preparing your resume…</p>;

  // Missing fields must never fabricate another person's experience or identity.
  const header = resumeData.header || {};
  const summary = resumeData.summary || "";
  const skills = resumeData.skills || [];
  const experience = resumeData.experience || [];
  const projects = resumeData.projects || [];
  const education = resumeData.education || [];

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
        {/* Title Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">ATS Resume Template</h1>
          <p className="text-slate-500 text-sm">Professional ATS-friendly resume format.</p>
        </div>

        {documentError && (
          <p role="alert" className="text-red-700">
            {documentError}
          </p>
        )}
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
                  Preview · PDF pagination may differ
                </span>
              </div>

              {/* Actual Resume Content Mockup */}
              <div
                id="resume-preview-content"
                className="flex flex-col text-sm leading-relaxed text-[#1e293b] font-sans px-2 bg-white"
              >
                {/* Header */}
                <div className="text-center pb-3">
                  <h2 className="text-2xl font-bold text-[#0f172a] tracking-wide uppercase">
                    {header.fullName || header.name}
                  </h2>
                  {header.title && <p className="text-sm text-[#334155] mt-1">{header.title}</p>}
                  <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[#64748b] mt-2 text-xs">
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
                    <h3 className="font-bold text-sm tracking-wider text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1 mb-2">
                      Career Objective
                    </h3>
                    <p className="text-[#334155] leading-relaxed text-sm text-left">{summary}</p>
                  </div>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                  <div className="mb-3">
                    <h3 className="font-bold text-sm tracking-wider text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1 mb-2">
                      Work Experience
                    </h3>
                    <div className="space-y-3">
                      {experience.map((exp, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between font-bold text-[#0f172a] text-sm">
                            <span>{exp.role || exp.title}</span>
                            <span className="font-normal text-[#475569]">{exp.duration}</span>
                          </div>
                          {exp.company && (
                            <div className="text-[#334155] italic text-sm mb-1">{exp.company}</div>
                          )}
                          {(exp.highlights || exp.bullets || []).length > 0 && (
                            <ul className="list-disc text-[#334155] text-sm ml-4 space-y-1 text-left">
                              {(exp.highlights || exp.bullets || []).map(
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
                    <h3 className="font-bold text-sm tracking-wider text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">
                      Projects
                    </h3>
                    <div className="space-y-3">
                      {projects.map((proj, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between font-bold text-slate-900 text-sm">
                            <span>{proj.title}</span>
                            <span className="font-normal text-slate-600">
                              {proj.duration || ""}
                            </span>
                          </div>
                          {(proj.highlights || proj.bullets || []).length > 0 && (
                            <ul className="list-disc text-slate-700 text-sm ml-4 space-y-1 text-left mt-1">
                              {(proj.highlights || proj.bullets || []).map(
                                (bullet: string, bIdx: number) => (
                                  <li key={bIdx} className="pl-1">
                                    {bullet}
                                  </li>
                                )
                              )}
                            </ul>
                          )}
                          {!proj.highlights && !proj.bullets && proj.description && (
                            <p className="text-slate-700 text-sm text-left mt-1">
                              {proj.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="mb-3">
                    <h3 className="font-bold text-sm tracking-wider text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1 mb-2">
                      Skills
                    </h3>
                    <p className="text-[#334155] text-sm leading-relaxed">{skills.join(" • ")}</p>
                  </div>
                )}

                {/* Education */}
                {education.length > 0 && (
                  <div className="mb-2">
                    <h3 className="font-bold text-sm tracking-wider text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1 mb-2">
                      Education
                    </h3>
                    <div className="space-y-2">
                      {education.map((edu, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-[#0f172a] text-sm">{edu.degree}</div>
                            <div className="text-[#475569] text-sm">{edu.year || edu.duration}</div>
                          </div>
                          <span className="font-normal text-[#475569] text-sm text-right">
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
            <div className="flex flex-wrap gap-3 mt-2">
              <button
                onClick={handleSync}
                disabled={isSavingResume || isDownloading || !resumeId}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                <BookmarkSquareIcon className="size-4" strokeWidth={3} />
                {isSavingResume ? "Saving..." : "Save Resume"}
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading || isSavingResume || !resumeId}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl font-medium transition-colors"
              >
                <ArrowDownTrayIcon className="size-4" />
                {isDownloading ? "Downloading..." : "Download PDF"}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={isSavingResume || isDownloading}
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
