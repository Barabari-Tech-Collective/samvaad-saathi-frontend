"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { guideStorageKey, WorkspaceGuide, type GuideStep } from "./WorkspaceGuide";
const steps: GuideStep[] = [
  {
    title: "Your interview preparation space",
    body: "Start with practice, then use your saved feedback to choose what to improve. You do not need a perfect first attempt.",
    target: 'a[href="/practice"]',
  },
  {
    title: "Practice and assessment have different purposes",
    body: "Practice lets you learn and retry. Assessment follows a published question count and deadline. Check the purpose before you begin.",
  },
  {
    title: "Speak, save, then move on",
    body: "Allow microphone access when asked. Your spoken answer must finish saving before you move to the next question. A processing result can arrive later.",
  },
  {
    title: "Return to your progress",
    body: "History keeps your submitted rounds and feedback. Practice-sharing choices are shown when they apply. You can replay this guide from Quick guide.",
    target: 'a[href="/history"]',
  },
];
export default function StudentGuide() {
  const { user, loading } = useAuth();
  const path = usePathname();
  // Help must never interrupt recording, a formal sitting, or device checks.
  if (loading || !user || !["/home", "/practice", "/history", "/profile"].includes(path))
    return null;
  const key = guideStorageKey(String(user.userId), "student", "student", 1);
  return <WorkspaceGuide key={key} storageKey={key} steps={steps} />;
}
