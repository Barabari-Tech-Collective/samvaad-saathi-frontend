"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeading from "@/components/studio/PageHeading";
import ResumeJourney from "@/components/studio/ResumeJourney";
import { useAIResumeContext } from "./resume-provider";
const reviewRoutes = new Set(["/ai-resume/score", "/ai-resume/skills", "/ai-resume/hygiene"]);
export default function ResumeWorkspace({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { analysisResult } = useAIResumeContext();
  if (reviewRoutes.has(path) && !analysisResult)
    return (
      <div className="studio-panel">
        <PageHeading
          eyebrow="Resume review"
          title="Let’s reopen your resume review."
          description="This page needs the analysis from your current upload. If you refreshed or opened a saved link, upload your resume again to see a fresh review."
        />
        <Link href="/ai-resume" className="ws-button ws-button-primary">
          Upload a resume
        </Link>
      </div>
    );
  return <ResumeJourney>{children}</ResumeJourney>;
}
