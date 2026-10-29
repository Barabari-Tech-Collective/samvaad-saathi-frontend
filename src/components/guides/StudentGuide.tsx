"use client";
import { usePathname } from "next/navigation";
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
    title: "Assessment reviews",
    body: "If one of your tests is flagged, you can read why here and ask for a second look.",
    href: "/assessment-reviews",
    target: link("/assessment-reviews"),
    optional: true,
  },
  {
    title: "Human interviews",
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

export default function StudentGuide() {
  const { user, loading } = useAuth();
  const path = usePathname();
  if (loading || !user) return null;
  const key = guideStorageKey(String(user.userId), "student", "student", 2);
  // Help is only offered on landing pages, never during recording or a formal sitting. A tour
  // the student started keeps going while it moves between pages.
  return (
    <WorkspaceGuide
      storageKey={key}
      steps={steps}
      offerHere={["/home", "/practice", "/history", "/profile"].includes(path)}
    />
  );
}
