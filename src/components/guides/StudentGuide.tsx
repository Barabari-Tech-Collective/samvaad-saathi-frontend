"use client";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { useLanguage } from "@/lib/i18n/language";
import { useAuth } from "@/components/providers/auth-provider";
import { type GuideStep, guideStorageKey, WorkspaceGuide } from "./WorkspaceGuide";

// Point at the real menu item; skip any page this account does not have.
const link = (path: string) => `nav[aria-label="Student navigation"] a[href="${path}"]`;

const steps: GuideStep[] = [
  {
    title: "Welcome! Let us look around",
    body: "This tour opens each page and shows what it is for. It takes about a minute, and you can stop any time.",
  },
  {
    title: "Home: your starting point",
    body: "Choose Coaching for a short skill activity or Mock Interviews for a full rehearsal.",
    href: "/home",
    target: link("/home"),
    optional: true,
  },
  {
    title: "Coaching: build one skill at a time",
    body: "Choose a short exercise, work on your suggested skill, or complete a task from your teacher.",
    href: "/coaching",
    target: link("/coaching"),
    optional: true,
  },
  {
    title: "Mock Interviews: rehearse an interview",
    body: "Rehearse an interview, continue a saved round, and review feedback. Mock Interviews are separate from assessments.",
    href: "/mock-interviews",
    target: link("/mock-interviews"),
    optional: true,
  },
  {
    title: "History: your finished rounds",
    body: "Every round you finish is saved here with feedback, so you can see how you are improving.",
    href: "/history",
    target: link("/history"),
    optional: true,
  },
  {
    title: "Test reviews",
    body: "If one of your tests is flagged, you can read why here and ask for a second look.",
    href: "/assessment-reviews",
    target: link("/assessment-reviews"),
    optional: true,
  },
  {
    title: "Live interviews",
    body: "Book and join an interview with a real person when your course offers it.",
    href: "/human-interviews",
    target: link("/human-interviews"),
    optional: true,
  },
  {
    title: "Resume: build a better one",
    body: "Check your resume and get tips to improve it.",
    href: "/ai-resume",
    target: link("/ai-resume"),
    optional: true,
  },
  {
    title: "Profile: your details",
    body: "Keep your details up to date and choose what your teachers can see about your practice.",
    href: "/profile",
    target: link("/profile"),
    optional: true,
  },
  {
    title: "Before you speak",
    body: "Allow the microphone when your browser asks. Speak, then wait for the word saved before you go to the next question. Press Quick guide at the bottom right to see this tour again.",
  },
];

const PHONE = "(max-width: 767px)";
const subscribePhone = (notify: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const isPhone = () => typeof window.matchMedia === "function" && window.matchMedia(PHONE).matches;

// On a phone the menu is the bottom bar, so the tour points at it in plain, short words.
const tab = (path: string) => `nav[aria-label="Bottom Navigation"] a[href="${path}"]`;
const phoneSteps: GuideStep[] = [
  {
    title: "Welcome!",
    body: "We will show you where things are. It takes one minute. You can stop any time.",
  },
  {
    title: "Home",
    body: "Start here. It shows what to do next.",
    href: "/home",
    target: tab("/home"),
  },
  {
    title: "Coaching",
    body: "Work on one skill with short exercises and tasks from your teacher.",
    href: "/coaching",
    target: tab("/coaching"),
  },
  {
    title: "Mock Interviews",
    body: "Rehearse an interview or continue a saved round. This is practice, not an assessment.",
    href: "/mock-interviews",
    target: tab("/mock-interviews"),
  },
  {
    title: "More",
    body: "Touch More to find History, your resume, your profile, your human interviews and your test reviews.",
    target: 'nav[aria-label="Bottom Navigation"] button[aria-label="More features"]',
  },
  {
    title: "Before you speak",
    body: "When your phone asks, touch Allow for the microphone. Speak, then wait for the word Saved before the next question.",
  },
];

export default function StudentGuide() {
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const { t } = useLanguage();
  const shown = useMemo(
    () =>
      (phone ? phoneSteps : steps).map((step) => ({
        ...step,
        title: t(step.title),
        body: t(step.body),
      })),
    [phone, t]
  );
  const { user, loading } = useAuth();
  const path = usePathname();
  if (loading || !user) return null;
  const key = guideStorageKey(String(user.userId), "student", "student", 2);
  // Help is only offered on landing pages, never during recording or a formal sitting. A tour
  // the student started keeps going while it moves between pages.
  return (
    <WorkspaceGuide
      storageKey={key}
      steps={shown}
      offerHere={[
        "/home",
        "/practice",
        "/coaching",
        "/mock-interviews",
        "/history",
        "/profile",
      ].includes(path)}
    />
  );
}
