"use client";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
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
    body: "See what you did lately and what to do next. A good first step is one short practice round.",
    href: "/home",
    target: link("/home"),
    optional: true,
  },
  {
    title: "Practice: learn without pressure",
    body: "Pick a practice round and speak your answers. You can try again and again. There is no pass or fail.",
    href: "/practice",
    target: link("/practice"),
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
    title: "Practice",
    body: "Speak your answers out loud. You can try again and again. There is no pass or fail.",
    href: "/practice",
    target: tab("/practice"),
  },
  {
    title: "History",
    body: "See your finished practice and the feedback you got.",
    href: "/history",
    target: tab("/history"),
  },
  {
    title: "More",
    body: "Touch More to find your resume, your profile, your interviews and your test results.",
    target: 'nav[aria-label="Bottom Navigation"] button[aria-label="More features"]',
  },
  {
    title: "Before you speak",
    body: "When your phone asks, touch Allow for the microphone. Speak, then wait for the word Saved before the next question.",
  },
];

export default function StudentGuide() {
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const { user, loading } = useAuth();
  const path = usePathname();
  if (loading || !user) return null;
  const key = guideStorageKey(String(user.userId), "student", "student", 2);
  // Help is only offered on landing pages, never during recording or a formal sitting. A tour
  // the student started keeps going while it moves between pages.
  return (
    <WorkspaceGuide
      storageKey={key}
      steps={phone ? phoneSteps : steps}
      offerHere={["/home", "/practice", "/history", "/profile"].includes(path)}
    />
  );
}
