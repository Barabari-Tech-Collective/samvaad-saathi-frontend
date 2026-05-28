"use client";

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
  message: string;
  success: boolean;
}

interface UseMutationApiProps<TData, TParams> {
  keyToInvalidate?: InvalidateQueryFilters<readonly unknown[]>;
  url: string;
  method?: "get" | "post" | "put" | "patch" | "delete";
  config?: AxiosRequestConfig;
  options?: Omit<UseMutationOptions<TData, AxiosError<APIError>, TParams>, "mutationFn">;
  successMessage?: string;
  errorMessage?: string;
}

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
export const createApiClient = (service: APIService | APIServiceV2) => {
  const axiosInstance = createAxiosInstance(baseUrls[service]);

  const useMutationApi = <TData, TParams = unknown>({
    keyToInvalidate,
    url,
    method = "post",
    config,
    options,
    successMessage,
    errorMessage,
  }: UseMutationApiProps<TData, TParams>) => {
    const queryClient = useQueryClient();
    const [cookies] = useCookies(["token"]);

    const mutateData = async (params: TParams): Promise<TData> => {
      try {
        // Try to get token from cookies first, fallback to react-cookie
        const token = getTokenFromCookies() || cookies.token;

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
        return res.data;
      } catch (error) {
        const err = error as AxiosError<{ detail?: string }>;
        const detail = err.response?.data?.detail ?? err.message;
        console.error(
          "API error:",
          typeof detail === "string" ? detail : JSON.stringify(err.response?.data ?? err)
        );
        throw error;
      }
    };

    const mutation = useMutation<TData, AxiosError<APIError>, TParams>({
      mutationKey: [url, method],
      mutationFn: mutateData,
      onSuccess: () => {
        if (successMessage) toast.success(successMessage);
        if (keyToInvalidate) {
          queryClient.invalidateQueries(keyToInvalidate);
        }
      },
      onError: (error) => {
        // Skip error handling for aborted requests
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          console.log("Request was cancelled");
          return;
        }

        console.log("error :", error);

        // TODO: replace x-request-id with the correct value

        // Track API error with PostHog
        trackApiError(error, {
          endpoint: url,
          method: method.toUpperCase(),
          status_code: error.response?.status,
          request_id:
            error.response?.headers?.["x-request-id"] || error.config?.headers?.["x-request-id"],
        });

        if (errorMessage) toast.error(errorMessage);

        // } else if (typeof error.response?.data?.detail === 'string') {
        //   toast.error(error.response?.data?.detail);
        // } else if (error.response?.data?.detail?.message) {
        //   toast.error(error.response?.data?.detail?.message);
        // } else {
        //   toast.error('Something went wrong. Please try again.');
        // }
      },
      ...options,
    });

    // Return a cleaner interface with loading and data
    return {
      ...mutation,
      loading: mutation.isPending,
      data: mutation.data,
      error: mutation.error,
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
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

    const fetchData = async (): Promise<TData> => {
      try {
        // Try to get token from cookies first, fallback to react-cookie
        const token = getTokenFromCookies() || cookies.token;

        const res = await axiosInstance({
          url,
          method,
          params,
          data,
          ...config,
          headers: {
            ...config?.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
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
        console.log("axiosError :", axiosError);
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
      }
    };

    const queryResult = useQuery<TData, AxiosError>({
      queryKey: [...key, params, data],
      queryFn: fetchData,
      enabled,
      staleTime: options.staleTime ?? 1000 * 60 * 5,
      ...options,
    });

    return queryResult;
  };

  return {
    useQuery: useQueryApi,
    useMutation: useMutationApi,
  };
};
