"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
const steps = [
  { path: "/ai-resume", label: "Upload" },
  { path: "/ai-resume/score", label: "Review" },
  { path: "/ai-resume/skills", label: "Skills" },
  { path: "/ai-resume/hygiene", label: "Polish" },
  { path: "/ai-resume/preview", label: "Template & export" },
];
export default function ResumeJourney({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="studio-resume-flow">
      <ol className="studio-resume-steps" aria-label="Resume review stages">
        {steps.map((step, index) => (
          <li
            key={step.path}
            aria-current={
              path === step.path ||
              (path === "/ai-resume/final" && step.path === "/ai-resume/preview")
                ? "step"
                : undefined
            }
          >
            <span aria-hidden="true">{index + 1}</span>
            {step.label}
          </li>
        ))}
      </ol>
      {children}
    </div>
  );
}
