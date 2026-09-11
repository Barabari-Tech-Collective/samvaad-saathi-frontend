"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import React from "react";
import { CookiesProvider } from "react-cookie";

// Retries network errors and 5xx (transient/server-side) failures, but never
// 4xx - those are the client's fault and retrying won't help. Scoped to
// queries only: mutations stay at retry: 0 below, since retrying a POST that
// actually succeeded server-side but lost its response could create a
// duplicate (e.g. a duplicate answer submission) - that's a bigger risk than
// a one-off failed request, and isn't safe to flip on without an
// idempotency review per mutation.
const shouldRetryOnTransientError = (failureCount: number, error: unknown) => {
  if (failureCount >= 3) return false;
  const axiosError = error as AxiosError;
  if (!axiosError?.response) return true; // network error / timeout
  return axiosError.response.status >= 500;
};

// Create a client with default options
const queryClient = new QueryClient({
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

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <CookiesProvider>{children}</CookiesProvider>
    </QueryClientProvider>
  );
};

export default AppProvider;
