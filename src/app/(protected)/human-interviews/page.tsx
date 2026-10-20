"use client";
import { useAuth } from "@/components/providers/auth-provider";
import { HumanInterviews } from "@/components/human-interviews/HumanInterviews";
export default function HumanInterviewsPage() {
  const { user, loading } = useAuth();
  if (loading || !user?.userId) return <output>Checking your identity…</output>;
  return <HumanInterviews key={String(user.userId)} accountKey={String(user.userId)} />;
}
