"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-config";

interface Appointment {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  join_opens_at: string;
  status: string;
  can_join: boolean;
  outcome_source: string | null;
}
interface Appointments {
  items: Appointment[];
  total: number;
  notice: string;
}
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#C0CFF2] px-4 py-2 font-medium text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:opacity-50";

function AppointmentCard({ row }: { row: Appointment }) {
  const alive = useRef(true);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <li className="space-y-4 rounded-2xl border border-[#DEE8FB] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-xl font-semibold text-[#1F285B]">{row.title}</h2>
        <span className="rounded-full bg-[#F5F9FF] px-3 py-1 text-sm">
          {row.status.replaceAll("_", " ")}
        </span>
      </div>
      <p>
        {new Date(row.starts_at).toLocaleString()} – {new Date(row.ends_at).toLocaleTimeString()}{" "}
        (your device time)
      </p>
      <p className="text-sm text-gray-600">
        Human interviewer · Google Meet opens separately
        {row.outcome_source ? " · outcome reported by your host" : ""}
      </p>
      {row.can_join ? (
        <button
          className={button}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            setUrl("");
            try {
              const link = await apiClient.get<{ url: string }>(
                `v2/human-interviews/me/${row.id}/join`
              );
              if (!alive.current) return;
              if (!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(link.url))
                throw new Error("Invalid meeting link");
              setUrl(link.url);
            } catch {
              if (alive.current)
                setError(
                  "The meeting link could not be verified. Refresh to check the time and your enrollment, or contact your program team. No attendance or score was recorded."
                );
            } finally {
              if (alive.current) setBusy(false);
            }
          }}
        >
          Check meeting access
        </button>
      ) : (
        row.status === "scheduled" && (
          <p className="text-sm text-gray-600">
            Joining opens {new Date(row.join_opens_at).toLocaleString()} and closes at the scheduled
            end. Refresh when it is time.
          </p>
        )
      )}
      {url && (
        <div className="space-y-2">
          <a
            className={`${button} bg-black text-white`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            Open Google Meet in a new tab
          </a>
          <p className="text-sm text-gray-600">
            Keep this page open. Your host admits you in Meet; opening this link does not confirm
            attendance.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {row.status === "no_show" && (
        <p className="text-sm">
          This was reported by the host, not detected automatically. Contact your program team if it
          needs review.
        </p>
      )}
      {["cancelled", "technical_issue"].includes(row.status) && (
        <p className="text-sm">
          Ask your program team about a replacement appointment. You will not be switched to an AI
          interview.
        </p>
      )}
    </li>
  );
}

export function HumanInterviews({ accountKey }: { accountKey: string }) {
  const [page, setPage] = useState(1);
  const query = apiClient.useQuery<Appointments>({
    url: `v2/human-interviews/me?page=${page}`,
    key: ["human-interviews", accountKey, page],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const data = query.isError || query.isFetching ? undefined : query.data;
  return (
    <section
      aria-label="Your human interviews"
      className="mx-auto w-full max-w-4xl space-y-6 py-6 sm:py-10"
    >
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#344499]">
          Meet your interviewer
        </p>
        <h1 className="text-3xl font-semibold text-[#1F285B] sm:text-4xl">Your human interviews</h1>
        <p className="text-gray-600">
          A conversation with a person, in a separate Google Meet tab. Your practice and AI
          assessments stay separate.
        </p>
      </header>
      <button className={button} disabled={query.isFetching} onClick={() => void query.refetch()}>
        Refresh appointments and access
      </button>
      {query.isError ? (
        <div role="alert">
          <p>
            Appointments could not be loaded. Check your connection and sign-in, then refresh. Your
            program team can help verify enrollment.
          </p>
        </div>
      ) : !data ? (
        <output>Checking your appointments…</output>
      ) : (
        <>
          <p className="text-sm text-gray-600">{data.notice}</p>
          {!data.items.length && (
            <div className="rounded-2xl border border-[#DEE8FB] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#1F285B]">No appointments on this page</h2>
              <p className="mt-2 text-gray-600">
                Your program team can schedule a human interview for you. You can continue
                practicing while you wait.
              </p>
            </div>
          )}
          <ul className="space-y-4">
            {data.items.map((row) => (
              <AppointmentCard key={`${row.id}:${query.dataUpdatedAt}`} row={row} />
            ))}
          </ul>
          {(page > 1 || data.total > 10) && (
            <nav aria-label="Human interview pages" className="flex flex-wrap items-center gap-4">
              <button className={button} disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous appointments
              </button>
              <span>Page {page}</span>
              <button
                className={button}
                disabled={page * 10 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next appointments
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
