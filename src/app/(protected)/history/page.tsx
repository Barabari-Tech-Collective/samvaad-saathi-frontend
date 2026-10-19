"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import {
  historyGroup,
  historyResumeHref,
  historyScore,
  historyTab,
  mergeHistory,
  parseHistoryPage,
  responseStatus,
  type HistoryGroup,
} from "@/lib/interview-history";

const client = createApiClient(APIService.INTERVIEWS);
const filters: { value: HistoryGroup; title: string }[] = [
  { value: "incomplete", title: "Saved sessions" },
  { value: "completed", title: "Completed" },
  { value: "closed", title: "Closed & other" },
];

function HistoryWorkspace({ account }: { account: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const tab = historyTab(search.get("tab"));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const query = useInfiniteQuery({
    queryKey: ["interview-history", account],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam, signal }) =>
      parseHistoryPage(
        await client.get("interviews", {
          params: { limit: 20, ...(pageParam === null ? {} : { cursor: pageParam }) },
          signal,
        }),
        pageParam
      ),
    getNextPageParam: (last, _pages, _cursor, cursors) =>
      last.nextCursor !== null && !cursors.includes(last.nextCursor) ? last.nextCursor : undefined,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const denied = [401, 403].includes(responseStatus(query.error) ?? 0);
  const items = denied ? [] : mergeHistory(query.data?.pages ?? []);
  const visible = items.filter((item) => historyGroup(item) === tab);
  const switchTab = (value: HistoryGroup) => {
    const params = new URLSearchParams(search.toString());
    params.set("tab", value);
    router.push(`/history?${params}`, { scroll: false });
  };
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-6 pb-10 text-[#111827] [overflow-wrap:anywhere]">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#344499]">
          Your interview journey
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#1F285B] sm:text-4xl">
          History &amp; feedback
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Find saved rounds, check completed work and return to feedback. Practice and assessment
          keep their own rules.
        </p>
        <Link
          href="/practice"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#DEE8FB] bg-white px-4 font-semibold text-[#344499]"
        >
          Back to Practice
        </Link>
      </header>
      <nav aria-label="History filters" className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={tab === filter.value}
            onClick={() => switchTab(filter.value)}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] ${tab === filter.value ? "border-[#1F285B] bg-[#1F285B] text-white" : "border-[#DEE8FB] bg-white text-[#1F285B]"}`}
          >
            {filter.title}
          </button>
        ))}
      </nav>
      {query.isPending && <p role="status">Loading your saved sessions…</p>}
      {query.isError && (
        <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold">
            {denied
              ? "History access could not be verified"
              : items.length
                ? "More history could not be loaded"
                : "Your history could not be loaded"}
          </h2>
          <p className="mt-2 text-sm">
            {denied
              ? "Previously loaded sessions are hidden. Check your account access, then try again."
              : "This is a loading problem, not an empty history. Your saved rounds have not been removed."}
          </p>
          <button
            type="button"
            disabled={query.isFetching}
            onClick={() =>
              void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
            }
            className="mt-3 min-h-11 rounded-xl border border-[#344499] px-4 font-semibold text-[#344499] disabled:opacity-50"
          >
            Try loading history again
          </button>
        </section>
      )}
      {!query.isPending && !denied && (
        <>
          <p className="text-sm text-gray-600">
            {items.length} sessions loaded · {visible.length} in this view
            {query.hasNextPage ? " · Older sessions are available below" : ""}
          </p>
          {!visible.length && !query.isError && (
            <section className="rounded-2xl border border-[#DEE8FB] bg-white p-6">
              <h2 className="font-semibold text-[#1F285B]">
                No{" "}
                {tab === "incomplete"
                  ? "saved sessions"
                  : tab === "completed"
                    ? "completed rounds"
                    : "closed rounds"}{" "}
                in the loaded history
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {query.hasNextPage
                  ? "Older pages may contain more. Load older sessions to check."
                  : "Choose another view or return to Practice when you’re ready."}
              </p>
            </section>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((item) => {
              const href = historyResumeHref(item, now);
              return (
                <article
                  key={item.interviewId}
                  className="min-w-0 rounded-2xl border border-[#DEE8FB] bg-white p-5 sm:p-6"
                >
                  <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold text-[#344499]">
                    <span>
                      {item.interviewMode === "practice"
                        ? "Practice"
                        : item.interviewMode === "assessment"
                          ? "Assessment"
                          : "Interview mode unverified"}
                    </span>
                    <span>· {item.status}</span>
                    <span>· {item.difficulty}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-[#1F285B]">{item.track}</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeZone: "Asia/Kolkata",
                    }).format(new Date(item.createdAt))}{" "}
                    · Session {item.interviewId}
                  </p>
                  {tab === "completed" ? (
                    <>
                      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#F5F9FF] p-4 text-sm">
                        <div>
                          <dt className="text-gray-600">Knowledge</dt>
                          <dd className="mt-1 font-semibold">
                            {historyScore(item.knowledgePercentage)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-600">Speech &amp; structure</dt>
                          <dd className="mt-1 font-semibold">
                            {historyScore(item.speechFluencyPercentage)}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-sm text-gray-600">
                        {item.summaryReportAvailable
                          ? "A feedback record is available. Open it to check its evidence and status."
                          : "A feedback record is not confirmed yet. Open the report page to check availability."}
                      </p>
                      <Link
                        href={`/report-summary?interviewId=${item.interviewId}`}
                        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-black px-5 py-3 font-semibold text-white"
                      >
                        Open feedback
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="mt-4 text-sm leading-6 text-gray-600">
                        {href
                          ? "Reopening checks current access, the saved plan and any device ownership rules before you continue."
                          : tab === "closed"
                            ? "This round is retained in your history. Its status does not offer a continuation action."
                            : item.status === "preparing"
                              ? "Preparation is not complete yet. Refresh history to check again."
                              : item.expiresAt && Date.parse(item.expiresAt) <= now
                                ? "The resume window has ended. Your saved evidence remains retained."
                                : !item.interviewMode
                                  ? "The session mode needs verification before continuation. Refresh history or ask your program team for help."
                                  : "This session cannot currently continue in its recorded state. Refresh history or ask your program team for help."}
                      </p>
                      {tab === "closed" && (
                        <Link
                          href={`/report-summary?interviewId=${item.interviewId}`}
                          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#344499] px-5 py-3 font-semibold text-[#344499]"
                        >
                          Check feedback &amp; receipt
                        </Link>
                      )}
                      {href && !query.isFetching && (
                        <Link
                          href={href}
                          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-black px-5 py-3 font-semibold text-white"
                        >
                          {item.interviewMode === "assessment"
                            ? "Open assessment"
                            : "Continue practice"}
                        </Link>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
          {query.hasNextPage && (
            <button
              type="button"
              disabled={query.isFetching}
              onClick={() => void query.fetchNextPage()}
              className="min-h-11 rounded-xl border border-[#344499] bg-white px-5 py-3 font-semibold text-[#344499] disabled:opacity-50"
            >
              {query.isFetchingNextPage ? "Loading older sessions…" : "Load older sessions"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
export default function InterviewHistory() {
  const { user, loading } = useAuth();
  if (loading || !user?.userId) return <p role="status">Checking your account…</p>;
  return <HistoryWorkspace key={String(user.userId)} account={String(user.userId)} />;
}
