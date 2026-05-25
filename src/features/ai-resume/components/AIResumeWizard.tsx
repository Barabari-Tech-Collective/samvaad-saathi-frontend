"use client";

import { useState } from "react";
import { ResumeInputScreen } from "./ResumeInputScreen";
import { ATSDashboardScreen } from "./ATSDashboardScreen";
import { SkillsFeedbackScreen } from "./SkillsFeedbackScreen";

export type Step = "input" | "ats-dashboard" | "skills-feedback";

export function AIResumeWizard() {
    const [step, setStep] = useState<Step>("input");

    return (
        <div className="w-full max-w-2xl mx-auto pb-20">
            {step === "input" && <ResumeInputScreen onNext={() => setStep("ats-dashboard")} />}
            {step === "ats-dashboard" && <ATSDashboardScreen onNext={() => setStep("skills-feedback")} onBack={() => setStep("input")} />}
            {step === "skills-feedback" && <SkillsFeedbackScreen onBack={() => setStep("ats-dashboard")} />}
        </div>
    );
}
