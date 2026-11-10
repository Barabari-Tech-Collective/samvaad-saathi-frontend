"use client";

import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-config";
import { dueText, statusWord } from "@/lib/dates";
import { useLanguage } from "@/lib/i18n/language";
import { drillHref } from "@/lib/learning-plans";
import { trackEvent } from "@/lib/posthog/tracking.utils";

const NAMES = {
  warm_up: "Warm-up chat",
  think_fast: "Think fast",
  pronunciation: "Pronunciation",
  structure: "Plan your answers",
  pace: "Speak at a good speed",
} as const;

interface Assignment {
  id: number;
  course_id: string;
  module: "warm_up" | "think_fast" | "pronunciation" | "structure" | "pace";
  reason: string;
  note: string | null;
  due_date: string | null;
  status: string;
}
interface AssignmentPage {
  items: Assignment[];
  total: number;
  notice: string;
}

export function CoachingAssignments({ accountKey = "current" }: { accountKey?: string }) {
  const [page, setPage] = useState(1);
  const query = apiClient.useQuery<AssignmentPage>({
    url: `v2/coaching-assignments/me?page=${page}&limit=10`,
    key: ["my-coaching-assignments", accountKey, page],
    options: { staleTime: 0, gcTime: 0, retry: false },
  });
  const fresh = query.isError || query.isFetching ? undefined : query.data;
  const data = fresh && Array.isArray(fresh.items) ? fresh : undefined;
  const { t } = useLanguage();
  // Nothing from a teacher means nothing to show here.
  if (!query.isError && (!data || !data.items.length) && page === 1) return null;
  return (
    <section aria-label={t("From your teacher")} className="studio-panel space-y-3">
      <h3 className="text-lg font-semibold text-[#1F285B]">{t("From your teacher")}</h3>
      {query.isError ? (
        <div role="alert">
          <p>{t("We couldn't load this. You can still practise.")}</p>
          <button className="ws-button mt-2" onClick={() => void query.refetch()}>
            {t("Try again")}
          </button>
        </div>
      ) : (
        data && (
          <>
            <p className="text-sm text-gray-600">{t("Late is fine. This never affects your score.")}</p>
            <ul className="divide-y divide-[#DEE8FB]">
              {data.items.map((row) => (
                <li key={row.id} className="space-y-2 py-4">
                  <h4 className="font-semibold">
                    {t(NAMES[row.module])}
                    {row.status !== "assigned" && ` · ${t(statusWord(row.status))}`}
                  </h4>
                  <p className="break-words">{row.reason}</p>
                  {row.note && (
                    <p className="whitespace-pre-wrap break-words text-sm text-gray-600">{row.note}</p>
                  )}
                  {row.due_date && <p className="text-sm">{dueText(row.due_date)}</p>}
                  {row.status === "assigned" && (
                    <Link
                      className="ws-button ws-button-primary"
                      href={`${drillHref(row.module)}?${row.module === "warm_up" || row.module === "think_fast" ? "assignment" : "coachingAssignment"}=${row.id}`}
                      onClick={() => trackEvent("coaching_assignment_started", { module: row.module })}
                    >
                      {t("Start")}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {(page > 1 || data.total > 10) && (
              <nav aria-label={t("More tasks")} className="flex flex-wrap items-center gap-4">
                <button className="min-h-11 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
                  {t("Previous")}
                </button>
                <button className="min-h-11 disabled:opacity-40" disabled={page * 10 >= data.total} onClick={() => setPage((v) => v + 1)}>
                  {t("Next")}
                </button>
              </nav>
            )}
          </>
        )
      )}
    </section>
  );
}
