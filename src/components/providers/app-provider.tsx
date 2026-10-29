"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import React, { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  getAuthRevision,
  getAuthStorageOwner,
  subscribeAuthRevision,
  SessionChangedError,
} from "@/lib/auth-session";
import { clearLogoutStorage } from "@/lib/logout-storage";
import { CookiesProvider } from "react-cookie";

// Retries network errors and 5xx (transient/server-side) failures, but never
// 4xx - those are the client's fault and retrying won't help. Scoped to
// queries only: mutations stay at retry: 0 below, since retrying a POST that
// actually succeeded server-side but lost its response could create a
// duplicate (e.g. a duplicate answer submission) - that's a bigger risk than
// a one-off failed request, and isn't safe to flip on without an
// idempotency review per mutation.
const shouldRetryOnTransientError = (failureCount: number, error: unknown) => {
  if (error instanceof SessionChangedError) return false;
  if (failureCount >= 3) return false;
  const axiosError = error as AxiosError;
  if (!axiosError?.response) return true; // network error / timeout
  return axiosError.response.status >= 500;
};

// Create a client with default options
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: shouldRetryOnTransientError,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
        gcTime: 10 * 60 * 1000, // Cache data for 10 minutes
      },
      mutations: {
        retry: 0,
      },
    },
  });

function AccountCache({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  useEffect(
    () => () => {
      void queryClient.cancelQueries();
      queryClient.clear();
    },
    [queryClient]
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function AccountBoundary({ children }: { children: React.ReactNode }) {
  const revision = useSyncExternalStore(subscribeAuthRevision, getAuthRevision, () => 0);
  const [readyRevision, setReadyRevision] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (readyRevision !== revision) {
      const owner = getAuthStorageOwner();
      let sameOwner = false;
      try {
        sameOwner =
          !owner.startsWith("opaque:") && sessionStorage.getItem("samvaad-storage-owner") === owner;
      } catch {
        /* No persistence. */
      }
      if (readyRevision !== null || !sameOwner) clearLogoutStorage();
      try {
        sessionStorage.setItem("samvaad-storage-owner", owner);
      } catch {
        /* Cache is still isolated. */
      }
      setReadyRevision(revision);
    }
  }, [revision, readyRevision]);
  // Unmount media, drafts and observers before a new account mounts, not just /me.
  if (readyRevision !== revision) return <p role="status">Updating your session…</p>;
  return <AccountCache key={revision}>{children}</AccountCache>;
}
const AppProvider = ({ children }: { children: React.ReactNode }) => (
  <CookiesProvider>
    <AccountBoundary>{children}</AccountBoundary>
  </CookiesProvider>
);
export default AppProvider;
