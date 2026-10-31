"use client";

import { useEffect } from "react";
import { CoachingAssignments } from "@/components/practice/CoachingAssignments";
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
  const status = query.isLoading
    ? "loading"
    : query.isFetching
      ? "refreshing"
      : hub
        ? "ready"
        : "error";
  return (
    <PracticeHubView
      key={`${area}:${account}`}
      area={area}
      hub={hub}
      status={status}
      name={firstName(user.authorizedUser.name)}
      onRefresh={() => void query.refetch()}
    >
      {area !== "mock" && (
        <CoachingAssignments key={String(account)} accountKey={String(account)} />
      )}
    </PracticeHubView>
  );
}
