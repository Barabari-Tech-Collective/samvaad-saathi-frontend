import ResumeWorkspace from "./_components/ResumeWorkspace";
import { ReactNode } from "react";
import { AIResumeProvider } from "./_components/resume-provider";

export default function AIResumeLayout({ children }: { children: ReactNode }) {
  return (
    <AIResumeProvider>
      <ResumeWorkspace>{children}</ResumeWorkspace>
    </AIResumeProvider>
  );
}
