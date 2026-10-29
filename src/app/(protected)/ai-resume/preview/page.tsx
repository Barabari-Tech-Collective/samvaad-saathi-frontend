"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  Squares2X2Icon,
  AcademicCapIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGetTemplateDetails } from "@/features/ai-resume/services/resumeBuilderService";
import { Suspense } from "react";

function TemplatePreviewContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId") || "";

  const { data: template, isLoading, isError, error } = useGetTemplateDetails(templateId);

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-slate-600 font-medium text-sm">Loading template details...</p>
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="w-full text-center py-20 space-y-4">
        <p className="text-red-500 font-semibold">
          {error?.message || "Failed to load template details."}
        </p>
        <Link
          href="/ai-resume/hygiene"
          className="inline-block px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold"
        >
          Back to Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-right-4 duration-500 pt-4">
      {/* Title Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">{template.name}</h1>
        <p className="text-slate-600 text-sm">Professional ATS-friendly resume format</p>
      </div>

      {/* Template Preview Section */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5">
        <p className="text-sm font-medium text-slate-700">
          Layout example. Your résumé content appears after analysis.
        </p>
        {/* Visual Preview Area */}
        <div
          aria-label="Illustrative resume layout"
          role="img"
          className="bg-slate-50 rounded-2xl p-6 flex justify-center items-center relative overflow-hidden h-72"
        >
          {/* The resume paper */}
          <div className="bg-white shadow-md rounded-lg w-48 h-64 p-4 flex flex-col gap-3 relative z-10">
            {/* Illustrative paper layout, not a generated resume preview. */}

            {/* Decorative layout lines */}
            <div className="h-3 w-4/5 bg-slate-800 rounded-full mb-1"></div>
            <div className="h-1.5 w-1/2 bg-slate-300 rounded-full"></div>

            <div className="h-2 w-1/3 bg-primary/60 rounded-full mt-3"></div>
            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
            <div className="h-1 w-5/6 bg-slate-200 rounded-full"></div>

            <div className="h-2 w-1/3 bg-primary/60 rounded-full mt-2"></div>
            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
            <div className="h-1 w-11/12 bg-slate-200 rounded-full"></div>
            <div className="h-1 w-4/5 bg-slate-200 rounded-full"></div>

            <div className="h-2 w-1/3 bg-primary/60 rounded-full mt-2"></div>
            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
            <div className="h-1 w-full bg-slate-200 rounded-full"></div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
            <ShieldCheckIcon className="size-4 text-primary" />
            <span className="text-xs font-medium text-slate-700">ATS Friendly</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
            <UserGroupIcon className="size-4 text-primary" />
            <span className="text-xs font-medium text-slate-700 leading-tight">
              Clear section
              <br />
              headings
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
            <Squares2X2Icon className="size-4 text-primary" />
            <span className="text-xs font-medium text-slate-700">Clean Structure</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
            <AcademicCapIcon className="size-4 text-primary" />
            <span className="text-xs font-medium text-slate-700 leading-tight">
              Optimized for
              <br />
              Freshers
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-2">
        <Link
          href={`/ai-resume/final?templateId=${templateId}`}
          className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:opacity-90 text-white rounded-2xl font-medium transition-colors shadow-sm active:scale-[0.98]"
        >
          <CheckIcon className="size-4" strokeWidth={3} />
          <span>Use This Template</span>
          <ArrowRightIcon className="size-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}

export default function ResumeTemplatePreviewPage() {
  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      <Suspense
        fallback={
          <div className="w-full flex flex-col items-center justify-center py-20 gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-slate-600 font-medium text-sm">Loading template details...</p>
          </div>
        }
      >
        <TemplatePreviewContent />
      </Suspense>
    </div>
  );
}
