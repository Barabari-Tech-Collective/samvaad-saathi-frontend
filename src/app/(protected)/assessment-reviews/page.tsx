"use client";
import { useAuth } from "@/components/providers/auth-provider";
import { AssessmentReviews } from "@/components/integrity-review/AssessmentReviews";
export default function ReviewsPage() {
  const { user, loading } = useAuth();
  if (loading || !user?.userId) return <output>Checking your identity…</output>;
  return <AssessmentReviews key={String(user.userId)} accountKey={String(user.userId)} />;
}
