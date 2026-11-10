"use client";
import { friendlyDateTime } from "@/lib/dates";
import PageHeading from "@/components/studio/PageHeading";
import { useLayoutEffect, useRef, useState } from "react";
import { getAuthRevision } from "@/lib/auth-session";
import {
  parseAssessmentReviewsPage,
  validReviewReason,
  type AssessmentReviewCase,
} from "@/lib/assessment-reviews";
import { apiClient } from "@/lib/api-config/src/instance";

const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#C0CFF2] px-4 py-2 font-medium text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:opacity-50";
function ReviewCard({ row, refresh }: { row: AssessmentReviewCase; refresh: () => void }) {
  const submit = apiClient.useMutation<unknown, Record<string, unknown>>({
    url: `v2/integrity/me/cases/${row.id}/actions`,
    method: "post",
  });
  const [action, setAction] = useState("explain");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ownerRevision = useRef(getAuthRevision()).current;
  const alive = useRef(true);
  const lock = useRef(false);
  const retry = useRef<{ body: string; key: string } | null>(null);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const options = [...(row.canExplain ? ["explain"] : []), ...(row.canAppeal ? ["appeal"] : [])];
  const selected = options.includes(action) ? action : options[0];
  return (
    <article className="space-y-4 rounded-2xl border border-[#DEE8FB] bg-white p-5">
      <h2 className="text-xl font-semibold">
        Assessment {row.interviewId} · Review {row.id}
      </h2>
      <p>
        Status: {row.state}. Outcome: {row.outcome ?? "No decision"}.
      </p>
      {row.appealDeadline && (
        <p>
          Appeal deadline: {friendlyDateTime(row.appealDeadline)}. The
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
              {(event.source ?? "System").replaceAll("_", " ")} ·{" "}
              {friendlyDateTime(event.at)}
            </p>
            {event.signals && (
              <details>
                <summary className="min-h-11 cursor-pointer py-2">
                  See what was noticed during the assessment
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
            if (lock.current || !alive.current || getAuthRevision() !== ownerRevision) return;
            const normalizedReason = validReviewReason(reason);
            if (!normalizedReason) {
              setError("Enter 10–2,000 characters before submitting your explanation.");
              return;
            }
            lock.current = true;
            setBusy(true);
            setError("");
            const value = {
              action: selected,
              reason: normalizedReason,
              expected_version: row.version,
            };
            const body = JSON.stringify(value);
            if (retry.current?.body !== body) {
              if (typeof globalThis.crypto?.randomUUID !== "function") {
                lock.current = false;
                setBusy(false);
                setError(
                  "Please update your browser and try again."
                );
                return;
              }
              retry.current = { body, key: globalThis.crypto.randomUUID() };
            }
            try {
              await submit.mutateAsync({
                ...value,
                request_key: retry.current.key,
              });
              if (alive.current && getAuthRevision() === ownerRevision) {
                retry.current = null;
                setReason("");
                refresh();
              }
            } catch {
              if (alive.current && getAuthRevision() === ownerRevision)
                setError(
                  "That didn't save. Your text is still here, so please try again."
                );
            } finally {
              lock.current = false;
              if (alive.current && getAuthRevision() === ownerRevision) setBusy(false);
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
          A different reviewer will look at your appeal.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
export function AssessmentReviews({ accountKey }: { accountKey: string }) {
  const [page, setPage] = useState(1);
  const query = apiClient.useQuery<unknown>({
    url: `v2/integrity/me/cases?page=${page}`,
    key: ["assessment-reviews", accountKey, page],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  // Keep the already verified case list and the student's unsent explanation on
  // screen during a focus refresh. A tab switch must not look like their review
  // evidence vanished.
  const data = query.isError ? undefined : parseAssessmentReviewsPage(query.data);
  const invalidResponse = !query.isError && !query.isLoading && query.data !== undefined && !data;
  return (
    <section className="mx-auto max-w-4xl space-y-6 py-6">
      <PageHeading
        eyebrow="Formal assessments"
        title="Test reviews"
        description="See why a test was flagged. You can tell us your side."
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
        This page is only for tests, not practice. A flag is not proof of cheating. A review does
        not change your score by itself.
      </p>
      {query.isError || invalidResponse ? (
        <p role="alert">
          We couldn't load your reviews. Please reload the page.
        </p>
      ) : query.isLoading || !data ? (
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
            <p>No test reviews.</p>
          )}
          <nav aria-label="Review notice pages" className="flex flex-wrap gap-3">
            <button className={button} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Earlier
            </button>
            <span>
              Page {page} · {data.total} notices
            </span>
            <button
              className={button}
              disabled={page * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
