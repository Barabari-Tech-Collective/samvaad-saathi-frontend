"use client";

import Link from "next/link";
import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { apiClient } from "@/lib/api-config";
import { interviewWhen, RESULT_LABELS } from "./HumanInterviews";

interface Row {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  role_name?: string | null;
  reschedule_count?: number;
  result?: string | null;
  result_released?: boolean;
}

// Top of Home: the next interview with a person, or a result that was just shared.
// Nothing shows when there is nothing to do.
export function NextInterview({ accountKey }: { accountKey: string }) {
  const query = apiClient.useQuery<{ items: Row[] }>({
    url: "v2/human-interviews/me?page=1",
    key: ["human-interviews", accountKey, "next"],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const items = query.isError ? [] : (query.data?.items ?? []);
  const now = Date.now();
  const next = items
    .filter((r) => r.status === "scheduled" && Date.parse(r.ends_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const result = items.find((r) => r.result_released && r.result);
  if (!next && !result) return null;
  const row = next ?? result!;
  return (
    <aside
      aria-label="Your interview with a person"
      className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-[#1F285B] bg-white p-5"
    >
      <VideoCameraIcon aria-hidden="true" className="size-8 text-[#344499]" />
      <div className="min-w-0 flex-1">
        {next ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#344499]">
              {next.reschedule_count ? "Interview time changed" : "Your next interview"}
            </p>
            <p className="text-lg font-semibold text-[#1F285B]">
              {next.title}
              {next.role_name && ` · ${next.role_name}`}
            </p>
            <p>{interviewWhen(next)}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#344499]">
              Interview result
            </p>
            <p className="text-lg font-semibold text-[#1F285B]">{row.title}</p>
            <p>{RESULT_LABELS[row.result ?? ""] ?? row.result}</p>
          </>
        )}
      </div>
      <Link className="ws-button" href="/human-interviews">
        {next ? "See details and join" : "See feedback"}
      </Link>
    </aside>
  );
}
