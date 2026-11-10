"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  HomeIcon,
  AcademicCapIcon,
  ClockIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  XMarkIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/providers/auth-provider";
import { workspaceSection } from "@/lib/workspace-navigation";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import PageNavigation from "./PageNavigation";
import { parseToday, useToday } from "./NextStep";
import { useLanguage } from "@/lib/i18n/language";

const destinations = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/coaching", label: "Practice", icon: AcademicCapIcon },
  { href: "/assessments", label: "Assessments", icon: ShieldCheckIcon, assigned: true },
  { href: "/history", label: "Progress", icon: ClockIcon },
  { href: "/ai-resume", label: "Resume", icon: DocumentTextIcon },
];
const titles: Record<string, string> = {
  home: "Home",
  practice: "Learning workspace",
  coaching: "Practice",
  "mock-interviews": "Practice",
  history: "Progress",
  profile: "Profile",
  assessments: "Assessments",
  "assessment-reviews": "Assessment reviews",
  "human-interviews": "Human Interviews",
  "opportunity-outcomes": "Opportunity outcomes",
  "interview-start": "Interview setup",
  interview: "Interview",
  "report-summary": "Feedback",
  "ai-resume": "Resume",
  "structure-your-answer": "Plan your answers",
  "pronunciation-practice": "Pronunciation",
  "control-your-pace": "Speak at a good speed",
  "warm-up-chat": "Warm-up chat",
  "think-fast": "Think fast",
};
export default function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const selectedSection = workspaceSection(pathname);
  const today = useToday(String(user?.userId ?? "signed-out"));
  const known = today.isError ? null : parseToday(today.data);
  // Show Assessments unless we know nothing is assigned, so a failed check never hides it.
  const showAssessments = !known || known.has_assessments || selectedSection === "/assessments";
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    try {
      setCompact(localStorage.getItem("samvaad-navigation-compact") === "true");
    } catch {
      // Storage can be unavailable in private or restricted browsing.
    }
  }, []);
  function toggleNavigation() {
    const next = !compact;
    setCompact(next);
    try {
      localStorage.setItem("samvaad-navigation-compact", String(next));
    } catch {
      // Navigation remains usable without persistence.
    }
  }
  const menu = useRef<HTMLDialogElement>(null);
  const previous = useRef(pathname);
  const main = useRef<HTMLElement>(null);
  const immersive = pathname === "/interview" || pathname === "/onboarding";
  const isHome = pathname === "/home";
  useEffect(() => {
    document.title = `${titles[pathname.split("/")[1]] ?? "Workspace"} · Samvaad Saathi`;
    if (previous.current !== pathname) {
      menu.current?.close();
      setMenuOpen(false);
      main.current?.focus();
      previous.current = pathname;
    }
  }, [pathname]);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) menu.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  function openMenu() {
    if (!menu.current?.open) menu.current?.showModal();
    setMenuOpen(true);
  }
  function navigation(mobile = false) {
    return (
      <nav aria-label={mobile ? "Mobile workspace navigation" : "Student navigation"}>
        <ul className="student-nav-list">
          {destinations
            .filter((item) => !item.assigned || showAssessments)
            .map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-label={t(label)}
                title={t(label)}
                onClick={() => {
                  if (mobile) menu.current?.close();
                }}
                aria-current={
                  selectedSection === href || selectedSection.startsWith(`${href}/`)
                    ? "page"
                    : undefined
                }
              >
                <Icon aria-hidden="true" />
                <span className="student-nav-label">{t(label)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <div
      className={`student-workspace ${immersive ? "student-workspace-immersive" : ""}`}
      data-compact={compact}
      data-studio-page={pathname.split("/")[1] || "home"}
    >
      <a className="workspace-skip" href="#student-content">
        Skip to main content
      </a>
      {!immersive && (
        <>
          <TopNav onMenuClick={openMenu} menuOpen={menuOpen} />
          <aside
            className="student-sidebar"
            id="student-desktop-menu"
            aria-label="Student workspace"
          >
            <div className="student-sidebar-heading">
              <span className="student-nav-label">Workspace</span>
              <button
                type="button"
                className="ws-icon-button student-sidebar-toggle"
                onClick={toggleNavigation}
                aria-label={compact ? "Expand navigation" : "Collapse navigation"}
                aria-expanded={!compact}
                aria-controls="student-desktop-menu"
                title={compact ? "Expand menu" : "Collapse menu"}
              >
                {compact ? (
                  <ChevronDoubleRightIcon aria-hidden="true" />
                ) : (
                  <ChevronDoubleLeftIcon aria-hidden="true" />
                )}
              </button>
            </div>
            {navigation()}
          </aside>
          <dialog
            ref={menu}
            id="student-mobile-menu"
            onClose={() => setMenuOpen(false)}
            className="student-menu-dialog"
            aria-labelledby="student-menu-title"
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < bounds.left ||
                event.clientX > bounds.right ||
                event.clientY < bounds.top ||
                event.clientY > bounds.bottom
              )
                menu.current?.close();
            }}
          >
            <div className="student-menu-heading">
              <h2 id="student-menu-title">{t("Your workspace")}</h2>
              <button
                type="button"
                className="ws-icon-button"
                aria-label="Close navigation"
                onClick={() => menu.current?.close()}
              >
                <XMarkIcon aria-hidden="true" />
              </button>
            </div>
            {navigation(true)}
          </dialog>
        </>
      )}
      <main ref={main} id="student-content" tabIndex={-1} className="student-main">
        {!immersive && <PageNavigation pathname={pathname} />}
        {immersive || isHome ? children : <div className="studio-page-frame">{children}</div>}
      </main>
      {!immersive && <BottomNav onMoreClick={openMenu} menuOpen={menuOpen} />}
    </div>
  );
}
