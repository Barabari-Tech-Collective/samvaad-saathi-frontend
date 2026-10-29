"use client";

import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-config";
import { trackEvent } from "@/lib/posthog/tracking.utils";

interface Assignment {
  id: number;
  course_id: string;
  module: "warm_up" | "think_fast";
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
  const data = query.isError || query.isFetching ? undefined : query.data;
  return (
    <section
      aria-label="Tasks from your teacher"
      className="mb-7 space-y-4 rounded-2xl border border-[#DEE8FB] bg-white p-5 sm:p-6"
    >
      <h2 className="text-xl font-semibold text-[#1F285B]">Tasks from your teacher</h2>
      {query.isError ? (
        <div role="alert">
          <p>Follow-ups could not be loaded. You can still practise independently.</p>
          <button className="ws-button" onClick={() => void query.refetch()}>
            Try loading follow-ups again
          </button>
        </div>
      ) : !data ? (
        <output>Loading your follow-ups…</output>
      ) : (
        <>
          <p className="text-sm text-gray-600">{data.notice}</p>
          {!data.items.length && (
            <p>
              {page === 1
                ? "Nothing from your teacher now. Choose a skill to practise."
                : "No coaching follow-ups on this page."}
            </p>
          )}
          <ul className="divide-y divide-[#DEE8FB]">
            {data.items.map((row) => (
              <li key={row.id} className="space-y-2 py-4">
                <h3 className="font-semibold">
                  {row.module === "warm_up" ? "Warm-up chat" : "Think fast"} · {row.status}
                </h3>
                <p className="break-words text-xs text-gray-500">Course: {row.course_id}</p>
                <p className="break-words">{row.reason}</p>
                {row.note && (
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-600">
                    {row.note}
                  </p>
                )}
                <p className="text-sm">
                  {row.due_date ? `Due ${row.due_date} (UTC)` : "No due date"}
                </p>
                {row.status === "assigned" && (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-xl bg-black px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
                    href={`${row.module === "warm_up" ? "/warm-up-chat" : "/think-fast"}?assignment=${row.id}`}
                    onClick={() =>
                      trackEvent("coaching_assignment_started", { module: row.module })
                    }
                  >
                    Start assigned practice
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {(page > 1 || data.total > 10) && (
            <nav aria-label="Your follow-up pages" className="flex flex-wrap items-center gap-4">
              <button
                className="min-h-11 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous follow-ups
              </button>
              <span className="text-sm">
                Page {page} · {data.total} follow-ups
              </span>
              <button
                className="min-h-11 disabled:opacity-40"
                disabled={page * 10 >= data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                Next follow-ups
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
