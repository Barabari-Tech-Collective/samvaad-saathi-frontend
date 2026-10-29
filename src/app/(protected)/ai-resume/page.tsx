"use client";

import { useRouter } from "next/navigation";
import { ResumeInputForm } from "./_components/ResumeInputForm";
import { useAIResumeContext } from "./_components/resume-provider";

export default function AIResumePage() {
  const router = useRouter();
  const { setUploadedFile } = useAIResumeContext();

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      <div className="flex flex-col gap-6 relative animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
        {/* Title Section */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Resume review</h1>
          <p className="text-slate-500 text-sm">
            Optimize your resume for ATS and role-specific hiring.
          </p>
        </div>

        {/* Form */}
        <ResumeInputForm
          onNext={() => router.push("/ai-resume/score")}
          onFileChange={setUploadedFile}
        />
      </div>
    </div>
  );
}
