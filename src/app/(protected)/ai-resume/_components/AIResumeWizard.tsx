"use client";

import { useState } from "react";
import { ResumeInputScreen } from "./ResumeInputScreen";
import { ATSDashboardScreen } from "./ATSDashboardScreen";
import { SkillsFeedbackScreen } from "./SkillsFeedbackScreen";
import { HygieneAndTemplateScreen } from "./HygieneAndTemplateScreen";
import { ResumeTemplatePreviewScreen } from "./ResumeTemplatePreviewScreen";
import { ResumeTemplateFullViewScreen } from "./ResumeTemplateFullViewScreen";

export type Step =
  | "input"
  | "ats-dashboard"
  | "skills-feedback"
  | "hygiene-template"
  | "template-preview"
  | "template-full-view";

export function AIResumeWizard() {
  const [step, setStep] = useState<Step>("input");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">
      {step === "input" && (
        <ResumeInputScreen onNext={() => setStep("ats-dashboard")} onFileChange={setUploadedFile} />
      )}
      {step === "ats-dashboard" && (
        <ATSDashboardScreen
          onNext={() => setStep("skills-feedback")}
          onBack={() => setStep("input")}
        />
      )}
      {step === "skills-feedback" && (
        <SkillsFeedbackScreen
          onNext={() => setStep("hygiene-template")}
          onBack={() => setStep("ats-dashboard")}
        />
      )}
      {step === "hygiene-template" && (
        <HygieneAndTemplateScreen
          onNext={() => setStep("template-preview")}
          onBack={() => setStep("skills-feedback")}
        />
      )}
      {step === "template-preview" && (
        <ResumeTemplatePreviewScreen
          onNext={() => setStep("template-full-view")}
          onBack={() => setStep("hygiene-template")}
        />
      )}
      {step === "template-full-view" && (
        <ResumeTemplateFullViewScreen
          onBack={() => setStep("template-preview")}
          file={uploadedFile}
        />
      )}
    </div>
  );
}
