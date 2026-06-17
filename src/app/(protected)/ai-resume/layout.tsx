import { ReactNode } from "react";
import { AIResumeProvider } from "./_components/resume-provider";

export default function AIResumeLayout({ children }: { children: ReactNode }) {
  return <AIResumeProvider>{children}</AIResumeProvider>;
}
