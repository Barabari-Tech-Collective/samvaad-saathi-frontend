"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  HomeIcon,
  MicrophoneIcon,
  ClockIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  UserCircleIcon,
  BriefcaseIcon,
  XMarkIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/providers/auth-provider";
import { workspaceSection } from "@/lib/workspace-navigation";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import PageNavigation from "./PageNavigation";

const destinations = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/practice", label: "Practice", icon: MicrophoneIcon },
  { href: "/history", label: "History", icon: ClockIcon },
  { href: "/assessment-reviews", label: "Assessment reviews", icon: ShieldCheckIcon },
  { href: "/human-interviews", label: "Human interviews", icon: VideoCameraIcon },
  { href: "/ai-resume", label: "Resume", icon: DocumentTextIcon },
  { href: "/profile", label: "Profile", icon: UserCircleIcon },
];
const titles: Record<string, string> = {
  home: "Home",
  practice: "Practice",
  history: "Interview history",
  profile: "Profile",
  "assessment-reviews": "Assessment reviews",
  "human-interviews": "Human interviews",
  "interview-start": "Interview setup",
  interview: "Interview",
  "report-summary": "Feedback",
  "ai-resume": "Resume",
  "structure-your-answer": "Answer structure",
  "pronunciation-practice": "Pronunciation",
  "control-your-pace": "Speaking pace",
  "warm-up-chat": "Warm-up",
  "think-fast": "Think fast",
};
export default function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const selectedSection = workspaceSection(pathname);
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
          {destinations.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                title={label}
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
                <span className="student-nav-label">{label}</span>
              </Link>
            </li>
          ))}
          {user?.authorizedUser.canUseBulkAts && (
            <li>
              <Link
                href="/bulk-ats"
                aria-label="Bulk ATS"
                title="Bulk ATS"
                onClick={() => {
                  if (mobile) menu.current?.close();
                }}
                aria-current={pathname.startsWith("/bulk-ats") ? "page" : undefined}
              >
                <BriefcaseIcon aria-hidden="true" />
                <span className="student-nav-label">Bulk ATS</span>
              </Link>
            </li>
          )}
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
              <h2 id="student-menu-title">Your workspace</h2>
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
        {children}
      </main>
      {!immersive && <BottomNav onMoreClick={openMenu} menuOpen={menuOpen} />}
    </div>
  );
}
