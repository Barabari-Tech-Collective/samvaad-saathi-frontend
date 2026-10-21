"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const destinations = [
  ["/home", "Your next step", "Home"],
  ["/practice", "Build a skill", "Practice"],
  ["/history", "Review your progress", "History"],
  ["/human-interviews", "Meet your interviewer", "Human interviews"],
  ["/ai-resume", "Prepare your resume", "Resume"],
  ["/profile", "Manage your preferences", "Profile"],
] as const;
const titles: Record<string, string> = {
  home: "Your next step",
  practice: "Practice",
  history: "Interview history",
  profile: "Profile and preferences",
  "human-interviews": "Human interviews",
  "interview-start": "Prepare for your interview",
  interview: "Interview",
  "report-summary": "Interview feedback",
  "ai-resume": "Resume builder",
};

export default function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const previous = useRef(pathname);
  const main = useRef<HTMLElement>(null);
  const immersive = pathname === "/interview" || pathname === "/onboarding";
  useEffect(() => {
    const title = titles[pathname.split("/")[1]];
    if (title) document.title = `${title} · Samvaad Saathi`;
    if (previous.current !== pathname) {
      main.current?.focus();
      previous.current = pathname;
    }
  }, [pathname]);
  return (
    <div className={`student-workspace ${immersive ? "student-workspace-immersive" : ""}`}>
      <a className="workspace-skip" href="#student-content">
        Skip to main content
      </a>
      {!immersive && (
        <>
          <TopNav />
          <aside className="student-sidebar" aria-label="Student workspace">
            <div className="student-sidebar-intro">
              <span className="workspace-eyebrow">YOUR WORKSPACE</span>
              <p>
                A little practice.
                <br />A stronger next step.
              </p>
            </div>
            <nav aria-label="Student navigation">
              <ul>
                {destinations.map(([href, description, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={
                        pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined
                      }
                    >
                      <span>{label}</span>
                      <small>{description}</small>
                    </Link>
                  </li>
                ))}
                {user?.authorizedUser.canUseBulkAts && (
                  <li>
                    <Link
                      href="/bulk-ats"
                      aria-current={pathname.startsWith("/bulk-ats") ? "page" : undefined}
                    >
                      Bulk ATS
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
            <p className="student-sidebar-note">Taleem. Tajurba. Taaqat.</p>
          </aside>
        </>
      )}
      <main ref={main} id="student-content" tabIndex={-1} className="student-main">
        {children}
      </main>
      {!immersive && <BottomNav />}
    </div>
  );
}
