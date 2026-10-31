"use client";
import { useAuth } from "@/components/providers/auth-provider";
import { OpportunityOutcomes } from "@/components/opportunity-outcomes/OpportunityOutcomes";
export default function OpportunityOutcomesPage() {
  const { user, loading } = useAuth();
  if (loading || !user?.userId) return <output>Checking your identity…</output>;
  return <OpportunityOutcomes key={String(user.userId)} accountKey={String(user.userId)} />;
}
