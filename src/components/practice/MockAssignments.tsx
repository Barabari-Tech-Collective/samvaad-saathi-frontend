"use client";
import { dueText, statusWord } from "@/lib/dates";
import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-config";
import { parseMockAssignments } from "@/lib/mock-assignments";
export function MockAssignments({ accountKey }: { accountKey: string }) {
  const [page, setPage] = useState(1);
  const query = apiClient.useQuery<unknown>({
    url: `v2/mock-assignments/me?page=${page}&limit=25`,
    key: ["mock-assignments", accountKey, page],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: false },
  });
  const data = query.isError || query.isFetching ? null : parseMockAssignments(query.data);
  return (
    <section
      className="mb-7 space-y-4 rounded-2xl border border-[#DEE8FB] bg-white p-5 sm:p-6"
      aria-label="Mock interviews assigned by your teacher"
    >
      <h2 className="text-xl font-semibold text-[#1F285B]">
        Mock interviews assigned by your teacher
      </h2>
      {query.isError || (query.data && !data) ? (
        <div role="alert">
          <p>We couldn't load your Mock Interviews.</p>
          <button className="ws-button mt-2" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <output aria-label="Loading" className="ws-next-loading"><span /><span /><span /></output>
      ) : (
        <>
          <p className="text-sm text-gray-600">{data.notice}</p>
          {!data.items.length ? (
            <p>No Mock Interviews assigned right now.</p>
          ) : (
            <ul className="divide-y divide-[#DEE8FB]">
              {data.items.map((item) => (
                <li key={item.id} className="space-y-2 py-4">
                  <h3 className="font-semibold">
                    {item.jobName}{item.status !== "assigned" && ` · ${statusWord(item.status)}`}
                  </h3>
                  <p>{item.reason}</p>
                  {item.note && <p className="text-sm text-gray-600">{item.note}</p>}
                  {item.dueDate && (
                    <p className="text-sm">{dueText(item.dueDate)}</p>
                  )}
                  {item.status === "assigned" && (
                    <Link
                      className="ws-button"
                      href={`/interview-start?mode=practice&jobProfileId=${item.jobProfileId}&courseId=${encodeURIComponent(item.courseId)}`}
                    >
                      Start assigned Mock Interview
                    </Link>
                  )}
                  {item.status === "completed" && <p className="text-sm font-medium">Completed</p>}
                  {item.status === "cancelled" && (
                    <p className="text-sm">This assignment was cancelled.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {data.total > data.limit && (
            <nav aria-label="Assigned Mock Interview pages" className="flex gap-4">
              <button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
                Previous
              </button>
              <span>Page {page}</span>
              <button
                disabled={page * data.limit >= data.total}
                onClick={() => setPage((v) => v + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
