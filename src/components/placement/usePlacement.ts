"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-config";
import { parsePlacementOptions, parsePlacementOverview } from "@/lib/placement";

const saveFailed = "We couldn't save your choice. Please try again.";

// What a learner has chosen, what they can still choose, and how to save a new choice.
// Account-scoped keys, and errored or refetching data is hidden rather than shown stale.
export function usePlacement({ loadOptions }: { loadOptions: boolean }) {
  const { user } = useAuth();
  const account = user?.userId;
  const queryClient = useQueryClient();
  const mine = apiClient.useQuery<unknown>({
    url: "v2/placement/me",
    key: ["placement-me", account],
    options: {
      enabled: !!user,
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const overview = mine.isError || mine.isFetching ? null : parsePlacementOverview(mine.data);
  const options = apiClient.useQuery<unknown>({
    url: "v2/placement/options",
    key: ["placement-options", account],
    options: {
      // The list is only fetched when it is needed: the learner still has to choose, or is changing.
      enabled: !!user && (loadOptions || overview?.needs_placement === true),
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const save = apiClient.useMutation<unknown, { batch_keys: string[] }>({
    url: "v2/placement/me",
    method: "put",
    showToastError: false,
    options: {
      // A different course changes what the whole app shows, so everything reloads.
      onSuccess: () => queryClient.invalidateQueries(),
    },
  });
  const choices =
    options.isError || options.isFetching ? null : parsePlacementOptions(options.data);
  return {
    account,
    mine,
    overview,
    options,
    choices,
    save: (keys: string[], done?: () => void) =>
      save.mutate({ batch_keys: keys }, { onSuccess: () => done?.() }),
    saving: save.isPending,
    saveError: save.isError ? saveError(save.error) : null,
  };
}

function saveError(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data
    ?.detail;
  return typeof detail === "string" && detail.trim() ? detail : saveFailed;
}
