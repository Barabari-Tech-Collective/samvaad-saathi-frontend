"use client";
import PageHeading from "@/components/studio/PageHeading";
import { useLayoutEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-config/src/instance";

type Case = {
  id: number;
  interview_id: number;
  state: string;
  outcome: string | null;
  version: number;
  appeal_deadline: string | null;
  can_explain: boolean;
  can_appeal: boolean;
  history: {
    kind: string;
    reason: string;
    at: string;
    source?: string;
    outcome?: string;
    signals?: { eventId: string; reason: string; recordedAt: string }[];
  }[];
};
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#C0CFF2] px-4 py-2 font-medium text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:opacity-50";
function ReviewCard({ row, refresh }: { row: Case; refresh: () => void }) {
  const submit = apiClient.useMutation<unknown, Record<string, unknown>>({
    url: `v2/integrity/me/cases/${row.id}/actions`,
    method: "post",
  });
  const [action, setAction] = useState("explain");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const lock = useRef(false);
  const retry = useRef<{ body: string; key: string } | null>(null);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const options = [...(row.can_explain ? ["explain"] : []), ...(row.can_appeal ? ["appeal"] : [])];
  const selected = options.includes(action) ? action : options[0];
  return (
    <article className="space-y-4 rounded-2xl border border-[#DEE8FB] bg-white p-5">
      <h2 className="text-xl font-semibold">
        Assessment {row.interview_id} · Review {row.id}
      </h2>
      <p>
        Status: {row.state}. Outcome: {row.outcome ?? "No decision"}.
      </p>
      {row.appeal_deadline && (
        <p>
          Appeal deadline: {new Date(row.appeal_deadline).toLocaleString()} (your device time). The
          server checks this deadline.
        </p>
      )}
      <ol aria-label={`Evidence and decisions for review ${row.id}`} className="space-y-4">
        {row.history.map((event, index) => (
          <li
            key={`${event.kind}:${event.at}:${index}`}
            className="border-l-2 border-[#C0CFF2] pl-4"
          >
            <p className="font-medium">
              {event.kind.replaceAll("_", " ")}
              {event.outcome ? ` · ${event.outcome}` : ""}
            </p>
            <p className="whitespace-pre-wrap break-words">{event.reason}</p>
            <p className="text-sm text-gray-600">
              {event.source?.replaceAll("_", " ")} · {new Date(event.at).toLocaleString()}
            </p>
            {event.signals && (
              <details>
                <summary className="min-h-11 cursor-pointer py-2">
                  View unverified browser observations
                </summary>
                <ul>
                  {event.signals.map((signal) => (
                    <li key={signal.eventId}>
                      {signal.reason} · {signal.recordedAt}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ol>
      {selected && (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError("");
            const value = {
              action: selected,
              reason: reason.trim(),
              expected_version: row.version,
            };
            const body = JSON.stringify(value);
            if (retry.current?.body !== body) retry.current = { body, key: crypto.randomUUID() };
            try {
              await submit.mutateAsync({
                ...value,
                request_key: retry.current.key,
              });
              if (alive.current) {
                retry.current = null;
                setReason("");
                refresh();
              }
            } catch {
              if (alive.current)
                setError(
                  "Could not confirm this action. Retry the same text, or reload to check the current case and deadline. Your text is kept here."
                );
            } finally {
              lock.current = false;
              if (alive.current) setBusy(false);
            }
          }}
        >
          <label className="block" htmlFor={`action-${row.id}`}>
            What would you like to do?
          </label>
          <select
            id={`action-${row.id}`}
            value={selected}
            disabled={busy}
            onChange={(e) => setAction(e.target.value)}
            className="min-h-11 w-full rounded-xl border p-3"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option === "appeal"
                  ? "Appeal this decision"
                  : "Provide technical or accessibility context"}
              </option>
            ))}
          </select>
          <label className="block" htmlFor={`reason-${row.id}`}>
            Your explanation (10–2,000 characters)
          </label>
          <textarea
            id={`reason-${row.id}`}
            required
            minLength={10}
            maxLength={2000}
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-32 w-full rounded-xl border p-3"
          />
          <p className="text-sm text-gray-600">
            Describe what happened. Do not include passwords or information about other people. Your
            assigned reviewers can read this explanation.
          </p>
          <button type="submit" disabled={busy || reason.trim().length < 10} className={button}>
            {busy ? "Submitting…" : selected === "appeal" ? "Submit appeal" : "Submit explanation"}
          </button>
        </form>
      )}
      {row.state === "appealed" && (
        <p>
          Your appeal is awaiting an independent reviewer. The original decision-maker cannot
          resolve it.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
export function AssessmentReviews({ accountKey }: { accountKey: string }) {
  const [page, setPage] = useState(1);
  const query = apiClient.useQuery<{ items: Case[]; total: number; notice: string }>({
    url: `v2/integrity/me/cases?page=${page}`,
    key: ["assessment-reviews", accountKey, page],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const data = query.isError || query.isFetching ? undefined : query.data;
  return (
    <section className="mx-auto max-w-4xl space-y-6 py-6">
      <PageHeading
        eyebrow="Formal assessments"
        title="Assessment reviews and appeals"
        description="Read the evidence, understand a decision and share your response."
        action={
          <button
            className="ws-button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Reload review notices
          </button>
        }
      />
      <p className="studio-panel text-sm studio-muted">
        These notices concern formal assessments. Practice interviews are excluded. A browser
        observation does not establish cheating, and review outcomes do not automatically change
        your score.
      </p>
      {query.isError ? (
        <p role="alert">
          Review notices could not be loaded. Check your session and reload. Previously cached
          evidence is hidden.
        </p>
      ) : !data ? (
        <output>Checking your review notices…</output>
      ) : (
        <>
          <p>{data.notice}</p>
          {data.items.length ? (
            data.items.map((row) => (
              <ReviewCard
                key={`${accountKey}:${row.id}:${row.version}`}
                row={row}
                refresh={() => void query.refetch()}
              />
            ))
          ) : (
            <p>No assessment reviews on this page.</p>
          )}
          <nav aria-label="Review notice pages" className="flex flex-wrap gap-3">
            <button className={button} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous notices
            </button>
            <span>
              Page {page} · {data.total} notices
            </span>
            <button
              className={button}
              disabled={page * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next notices
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
