import React, { useSyncExternalStore } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
const subscribe = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};
const navigate = (url: string) => {
  history.pushState({}, "", url);
  window.dispatchEvent(new Event("popstate"));
};
const router = { push: navigate, replace: navigate };
export function useRouter() {
  return router;
}
export function useSearchParams() {
  return new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search));
}
export default function Link({
  href,
  children,
  onClick,
  prefetch: _prefetch,
  ...props
}: React.ComponentProps<"a"> & { href: string; prefetch?: boolean }) {
  void _prefetch;
  return (
    <a
      {...props}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
export function useAuth() {
  return { isLoadingUser: false, canCreateRoles: true, isAdmin: true, isSuperAdmin: false };
}
async function request(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    ...(method !== "GET"
      ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Request failed");
  return result;
}
export const api = {
  useQuery: <T,>(options: {
    url: string;
    key: unknown[];
    enabled?: boolean;
    refetchInterval?: number | false;
  }) =>
    useQuery<T>({
      queryKey: options.key,
      queryFn: () => request(options.url),
      enabled: options.enabled,
      refetchInterval: options.refetchInterval,
      retry: false,
    }),
  useMutation: <T, E, V>(options: { url: string | ((variables: V) => string); method: string }) =>
    useMutation<T, E, V>({
      mutationFn: (variables) =>
        request(
          typeof options.url === "function" ? options.url(variables) : options.url,
          options.method,
          variables
        ),
    }),
};
export function useJobProfilesList(
  _category?: string,
  _limit?: number,
  purpose: "practice" | "assessment" = "practice"
) {
  const endpoint = purpose === "practice" ? "practice-templates" : "assessment-roles";
  const query = useQuery({
    queryKey: ["fixture-templates", purpose],
    queryFn: () => request(`/samvaad/v2/${endpoint}`),
    retry: false,
  });
  const jobProfiles = (query.data?.items ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    jobProfileId: p.id,
    jobName: p.job_name,
    interviewMode: p.interviewMode,
    questionsPerInterview: p.questionsPerInterview,
  }));
  return { ...query, jobProfiles, isLoadingJobProfiles: query.isLoading };
}
export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}
