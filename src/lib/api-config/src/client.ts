"use client";

import { productSession } from "@/lib/session-runtime";
import { assertAuthRevision, getAuthRevision, SessionChangedError } from "@/lib/auth-session";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ServerSessionClient, SessionClientError } from "@/lib/server-session-client";
import { subscribeAuthRevision } from "@/lib/auth-session";
import { trackApiError } from "@/lib/posthog/tracking.utils";
import { getTokenFromCookies } from "@/lib/token-utils";
import {
  InvalidateQueryFilters,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { AxiosError, AxiosRequestConfig } from "axios";
import { useCookies } from "react-cookie";
import toast from "react-hot-toast";
import { APIService, APIServiceV2, AUTH_BASE_URL, createAxiosInstance } from "./config";

interface UseQueryApiProps<TData> {
  key: unknown[];
  url: string;
  enabled?: boolean;
  method?: "get" | "post";
  config?: AxiosRequestConfig;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
  options?: Omit<UseQueryOptions<TData, AxiosError>, "queryKey" | "queryFn">;
}

interface APIError {
  message?: string;
  success?: boolean;
  // FastAPI's actual error shape ({"detail": "..."}) - several call sites
  // already read error.response.data.detail at runtime (it works, since
  // that's genuinely what the backend sends), but this type didn't declare
  // it, so any caller using the properly-typed mutation.error had to cast
  // around it instead of getting a real type error caught the honest way.
  detail?: string | { message?: string } | Array<{ msg?: string }>;
}

interface UseMutationApiProps<TData, TParams> {
  keyToInvalidate?: InvalidateQueryFilters<readonly unknown[]>;
  url: string;
  method?: "get" | "post" | "put" | "patch" | "delete";
  config?: AxiosRequestConfig;
  options?: Omit<UseMutationOptions<TData, AxiosError<APIError>, TParams>, "mutationFn">;
  successMessage?: string;
  errorMessage?: string;
  showToastError?: boolean;
}

export const extractApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  const axiosError = error as AxiosError<APIError>;
  const errorData = axiosError?.response?.data;

  if (typeof errorData?.detail === "string" && errorData.detail.trim().length > 0) {
    return errorData.detail;
  }
  if (Array.isArray(errorData?.detail) && errorData.detail.length > 0) {
    const firstDetail = errorData.detail[0];
    if (typeof firstDetail === "string") {
      return firstDetail;
    }
    if (firstDetail && typeof firstDetail === "object" && "msg" in firstDetail) {
      return (firstDetail as { msg?: string }).msg || fallback;
    }
  }
  if (errorData?.detail && typeof errorData.detail === "object" && "message" in errorData.detail) {
    const message = (errorData.detail as { message?: string }).message;
    if (message && message.trim().length > 0) {
      return message;
    }
  }
  if (typeof errorData?.message === "string" && errorData.message.trim().length > 0) {
    return errorData.message;
  }
  if (typeof axiosError?.message === "string" && axiosError.message.trim().length > 0) {
    return axiosError.message;
  }

  return fallback;
};

const baseUrls = {
  [APIService.AUTH]: AUTH_BASE_URL || "",
  [APIService.USERS]: AUTH_BASE_URL || "",
  [APIService.RESUME]: AUTH_BASE_URL || "",
  [APIService.INTERVIEWS]: AUTH_BASE_URL || "",
  [APIService.TRANSCRIBE]: AUTH_BASE_URL || "",
  [APIService.ANALYSIS]: AUTH_BASE_URL || "",
  [APIService.TTS]: AUTH_BASE_URL || "",
  [APIService.PACING]: AUTH_BASE_URL || "",
};

// Hook-based API client that uses react-cookie
export const createApiClient = (
  service: APIService | APIServiceV2,
  session: ServerSessionClient | undefined = productSession()
) => {
  const axiosInstance = createAxiosInstance(baseUrls[service], session);
  const revision = session ? session.revision : getAuthRevision;
  const subscribe = session ? session.subscribe : subscribeAuthRevision;
  const assertOwner = (expected: number) => {
    if (session) {
      const current = session.snapshot();
      if (!current.authenticated || current.revision !== expected)
        throw new SessionClientError(409, "Your session changed. Reload this task.");
    } else assertAuthRevision(expected);
  };

  const useMutationApi = <TData, TParams = unknown>({
    keyToInvalidate,
    url,
    method = "post",
    config,
    options,
    successMessage,
    errorMessage,
    showToastError,
  }: UseMutationApiProps<TData, TParams>) => {
    const queryClient = useQueryClient();
    const [cookies] = useCookies(["token"]);

    const ownerRevision = useSyncExternalStore(subscribe, revision, () => 0);
    const mutateData = async (params: TParams): Promise<TData> => {
      assertOwner(ownerRevision);
      try {
        // Try to get token from cookies first, fallback to react-cookie
        const token = session ? null : getTokenFromCookies() || cookies.token;

        // Support dynamic signal getter (for request cancellation)
        const signalGetter = (
          config as AxiosRequestConfig & {
            _signalGetter?: () => AbortSignal | undefined;
          }
        )?._signalGetter;
        const signal = signalGetter ? signalGetter() : config?.signal;

        const res = await axiosInstance({
          url,
          method,
          data: params,
          ...config,
          ...(signal && { signal }),
          headers: {
            ...config?.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        assertOwner(ownerRevision);
        return res.data;
      } catch (error) {
        throw error;
      }
    };

    const ownsMutation = () =>
      !session || (session.snapshot().authenticated && revision() === ownerRevision);
    const invalidateOwnedQueries = () => {
      if (!keyToInvalidate) return;
      if (!session) {
        void queryClient.invalidateQueries(keyToInvalidate);
        return;
      }
      // The credential-free profile is owned by the account-boundary QueryClient.
      if (keyToInvalidate.queryKey?.[0] === "me")
        void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({
        ...keyToInvalidate,
        queryKey: [
          "cookie-session",
          session.cacheScope,
          ownerRevision,
          ...(keyToInvalidate.queryKey ?? []),
        ],
      });
    };
    const mutation = useMutation<TData, AxiosError<APIError>, TParams>({
      mutationKey: session
        ? ["cookie-session", session.cacheScope, ownerRevision, url, method]
        : [url, method],
      mutationFn: mutateData,
      onSuccess: () => {
        if (successMessage) toast.success(successMessage);
        if (keyToInvalidate) {
          invalidateOwnedQueries();
        }
      },
      onError: (error) => {
        if (error instanceof SessionChangedError || error instanceof SessionClientError) return;
        // Skip error handling for aborted requests
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          console.log("Request was cancelled");
          return;
        }

        // TODO: replace x-request-id with the correct value

        // Track API error with PostHog
        trackApiError(error, {
          endpoint: url,
          method: method.toUpperCase(),
          status_code: error.response?.status,
          request_id:
            error.response?.headers?.["x-request-id"] || error.config?.headers?.["x-request-id"],
        });

        // Only show a toast if an error toast was specifically intended
        // (i.e. if errorMessage is defined, or showToastError is explicitly true)
        const shouldToast = showToastError !== undefined ? showToastError : Boolean(errorMessage);

        if (shouldToast) {
          const messageToShow = extractApiErrorMessage(
            error,
            errorMessage || "Something went wrong. Please try again."
          );
          toast.error(messageToShow);
        }
      },
      ...options,
      ...(session
        ? {
            retry: false,
            mutationKey: ["cookie-session", session.cacheScope, ownerRevision, url, method],
            mutationFn: mutateData,
            onMutate: async (
              ...args: Parameters<NonNullable<NonNullable<typeof options>["onMutate"]>>
            ) => {
              assertOwner(ownerRevision);
              return options?.onMutate?.(...args);
            },
            onSuccess: async (
              ...args: Parameters<NonNullable<NonNullable<typeof options>["onSuccess"]>>
            ) => {
              if (!ownsMutation()) return;
              if (successMessage) toast.success(successMessage);
              invalidateOwnedQueries();
              await options?.onSuccess?.(...args);
            },
            onError: async (
              ...args: Parameters<NonNullable<NonNullable<typeof options>["onError"]>>
            ) => {
              if (!ownsMutation()) return;
              const [error] = args;
              if (
                error instanceof SessionClientError ||
                error instanceof SessionChangedError ||
                error.code === "ERR_CANCELED"
              )
                return;
              if (showToastError ?? Boolean(errorMessage))
                toast.error(
                  extractApiErrorMessage(
                    error,
                    errorMessage || "Something went wrong. Please try again."
                  )
                );
              await options?.onError?.(...args);
            },
            onSettled: async (
              ...args: Parameters<NonNullable<NonNullable<typeof options>["onSettled"]>>
            ) => {
              if (ownsMutation()) await options?.onSettled?.(...args);
            },
          }
        : {}),
    });

    const [mutationRevision, setMutationRevision] = useState(ownerRevision);
    const visibleMutation = !session || mutationRevision === ownerRevision;
    const resetMutation = mutation.reset;
    useEffect(() => {
      if (session) {
        resetMutation();
        setMutationRevision(ownerRevision);
      }
    }, [ownerRevision, resetMutation]);

    // Per-call callbacks need the same ownership checks as hook-level callbacks.
    const ownedCallbacks = (callbacks: Parameters<typeof mutation.mutate>[1]) => {
      if (!session || !callbacks) return callbacks;
      return {
        ...callbacks,
        onSuccess: (...args: Parameters<NonNullable<typeof callbacks.onSuccess>>) => {
          if (ownsMutation()) callbacks.onSuccess?.(...args);
        },
        onError: (...args: Parameters<NonNullable<typeof callbacks.onError>>) => {
          if (ownsMutation()) callbacks.onError?.(...args);
        },
        onSettled: (...args: Parameters<NonNullable<typeof callbacks.onSettled>>) => {
          if (ownsMutation()) callbacks.onSettled?.(...args);
        },
      };
    };
    // Return a cleaner interface with loading and data
    return {
      ...mutation,
      loading: mutation.isPending,
      data: visibleMutation ? mutation.data : undefined,
      error: visibleMutation ? mutation.error : null,
      mutate: (variables: TParams, callbacks?: Parameters<typeof mutation.mutate>[1]) =>
        mutation.mutate(variables, ownedCallbacks(callbacks)),
      mutateAsync: (variables: TParams, callbacks?: Parameters<typeof mutation.mutateAsync>[1]) =>
        mutation.mutateAsync(variables, ownedCallbacks(callbacks)),
    };
  };

  const useQueryApi = <TData>({
    key,
    url,
    enabled = true,
    method = "get",
    config,
    params,
    data,
    options = {},
  }: UseQueryApiProps<TData>) => {
    const [cookies] = useCookies(["token"]);

    const ownerRevision = useSyncExternalStore(subscribe, revision, () => 0);
    const fetchData = async ({ signal: querySignal }: { signal: AbortSignal }): Promise<TData> => {
      assertOwner(ownerRevision);
      const controller = new AbortController();
      const abort = () => controller.abort();
      const signals = [querySignal, config?.signal];
      for (const signal of signals) {
        if (signal?.aborted) abort();
        signal?.addEventListener?.("abort", abort, { once: true });
      }
      try {
        // Try to get token from cookies first, fallback to react-cookie
        const token = session ? null : getTokenFromCookies() || cookies.token;

        const res = await axiosInstance({
          url,
          method,
          params,
          data,
          ...config,
          signal: controller.signal,
          headers: {
            ...config?.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        assertOwner(ownerRevision);
        return res.data;
      } catch (error) {
        // Skip error handling for aborted requests
        if (
          (error as Error).name === "CanceledError" ||
          (error as AxiosError).code === "ERR_CANCELED"
        ) {
          console.log("Query was cancelled");
          throw error;
        }

        // Track API error with PostHog
        const axiosError = error as AxiosError;
        trackApiError(error as Error, {
          endpoint: url,
          method: method.toUpperCase(),
          status_code: axiosError.response?.status,
          request_id:
            axiosError.response?.headers?.["x-request-id"] ||
            axiosError.config?.headers?.["x-request-id"],
          operation: "query",
        });

        throw error;
      } finally {
        for (const signal of signals) signal?.removeEventListener?.("abort", abort);
      }
    };

    // Keep the logical prefix first so existing invalidation keys still work.
    const sessionKey = session
      ? [
          "cookie-session",
          session.cacheScope,
          ownerRevision,
          ...key,
          {
            url: config?.url ?? url,
            method: config?.method ?? method,
            params: config?.params ?? params,
            data: config?.data ?? data,
          },
        ]
      : [];
    const queryResult = useQuery<TData, AxiosError>({
      queryKey: session ? sessionKey : [...key, params, data],
      queryFn: fetchData,
      enabled: enabled && (!session || session.snapshot().authenticated),
      staleTime: options.staleTime ?? 1000 * 60 * 5,
      ...options,
      ...(session
        ? {
            queryKey: sessionKey,
            enabled: enabled && options.enabled !== false && session.snapshot().authenticated,
            retry: false,
            placeholderData: undefined,
            initialData: undefined,
            queryFn: fetchData,
          }
        : {}),
    });

    return queryResult;
  };

  // Cancellable reads for TanStack infinite queries; share token refresh and
  // the same Axios transport used by the existing hooks.
  const get = async <TData>(url: string, config: AxiosRequestConfig = {}): Promise<TData> => {
    const expected = revision();
    assertOwner(expected);
    const token = session ? null : getTokenFromCookies();
    const response = await axiosInstance.get<TData>(url, {
      ...config,
      headers: { ...config.headers, ...(token && { Authorization: `Bearer ${token}` }) },
    });
    assertOwner(expected);
    return response.data;
  };
  return {
    get,
    useQuery: useQueryApi,
    useMutation: useMutationApi,
  };
};
