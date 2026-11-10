"use client";

import { useEffect } from "react";
import { CoachingAssignments } from "@/components/practice/CoachingAssignments";
import { LearningPlans } from "@/components/practice/LearningPlans";
import { NextStep } from "@/components/workspace/NextStep";
import { MockAssignments } from "@/components/practice/MockAssignments";
import {
  PracticeHubSkeleton,
  PracticeHubView,
  type LearningArea,
} from "@/components/practice/PracticeHub";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient, ENDPOINTS } from "@/lib/api-config";
import { firstName, parsePracticeHub, type PracticeHubResponse } from "@/lib/practice-hub";
import { trackEvent } from "@/lib/posthog/tracking.utils";

export default function LearningWorkspace({ area }: { area: LearningArea }) {
  const { user, loading } = useAuth();
  const account = user?.userId;
  const query = apiClient.useQuery<PracticeHubResponse>({
    key: [ENDPOINTS.PRACTICE.HUB, String(account ?? "signed-out")],
    url: ENDPOINTS.PRACTICE.HUB,
    options: {
      enabled: !!account && !loading,
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: true,
    },
  });
  useEffect(() => {
    if (account) trackEvent("practice_hub_viewed", { area });
  }, [account, area]);
  if (loading || !account) return <PracticeHubSkeleton area={area} />;
  const hub = query.isError ? null : parsePracticeHub(query.data);
  // Do not offer a new mock or resume action from stale data while this workspace
  // is being reconciled after a tab return. The focused card retains its context,
  // but its action stays gated until the verified response arrives.
  const status = query.isLoading
    ? "loading"
    : query.isFetching
      ? "refreshing"
      : hub
        ? "ready"
        : "error";
  return (
    <PracticeHubView
      top={area === "coaching" ? <NextStep accountKey={String(account)} /> : undefined}
      key={`${area}:${account}`}
      area={area}
      hub={hub}
      status={status}
      name={firstName(user.authorizedUser.name)}
      onRefresh={() => void query.refetch()}
    >
      {area !== "mock" && (
        <>
          <LearningPlans key={`plans:${account}`} accountKey={String(account)} />
          <CoachingAssignments key={String(account)} accountKey={String(account)} />
        </>
      )}
      {area === "mock" && <MockAssignments key={`mocks:${account}`} accountKey={String(account)} />}
    </PracticeHubView>
  );
}
