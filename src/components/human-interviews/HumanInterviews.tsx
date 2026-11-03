"use client";

import { getAuthRevision } from "@/lib/auth-session";
import {
  parseHumanInterviewsPage,
  verifiedGoogleMeetUrl,
  type HumanInterviewAppointment,
  type HumanInterviewStatus,
} from "@/lib/human-interviews";

import PageHeading from "@/components/studio/PageHeading";
import { useLayoutEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-config";

const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#C0CFF2] px-4 py-2 font-medium text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:opacity-50";

function statusLabel(status: HumanInterviewStatus) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function appointmentTime(iso: string, timezone: string | null | undefined) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function appointmentDuration(row: HumanInterviewAppointment) {
  if (typeof row.durationMinutes === "number" && row.durationMinutes > 0)
    return `${row.durationMinutes} minutes`;
  const minutes = Math.round((Date.parse(row.endsAt) - Date.parse(row.startsAt)) / 60_000);
  return Number.isFinite(minutes) && minutes > 0 ? `${minutes} minutes` : null;
}

function AppointmentCard({ row }: { row: HumanInterviewAppointment }) {
  const ownerRevision = useRef(getAuthRevision()).current;
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
  const joinLock = useRef(false);
  const platform = row.meetingPlatform;
  const duration = appointmentDuration(row);
  return (
    <li className="space-y-4 rounded-2xl border border-[#DEE8FB] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="studio-eyebrow">Human Interview</p>
          <h2 className="min-w-0 break-words text-xl font-semibold text-[#1F285B]">
            {row.roundName || row.title}
          </h2>
        </div>
        <span className="rounded-full bg-[#F5F9FF] px-3 py-1 text-sm">
          {statusLabel(row.status)}
        </span>
      </div>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
        {row.opportunityTitle && (
          <>
            <dt className="font-semibold text-[#1F285B]">Opportunity</dt>
            <dd>{row.opportunityTitle}</dd>
          </>
        )}
        <dt className="font-semibold text-[#1F285B]">Date and time</dt>
        <dd>
          {appointmentTime(row.startsAt, row.timezone)}
          {row.timezone ? ` (${row.timezone})` : " (your device time)"}
        </dd>
        {duration && (
          <>
            <dt className="font-semibold text-[#1F285B]">Duration</dt>
            <dd>{duration}</dd>
          </>
        )}
        {row.interviewerName && (
          <>
            <dt className="font-semibold text-[#1F285B]">Interviewer</dt>
            <dd>{row.interviewerName}</dd>
          </>
        )}
        <dt className="font-semibold text-[#1F285B]">Meeting platform</dt>
        <dd>{platform}</dd>
        {row.instructions && (
          <>
            <dt className="font-semibold text-[#1F285B]">Instructions</dt>
            <dd className="whitespace-pre-wrap">{row.instructions}</dd>
          </>
        )}
      </dl>
      <p className="text-sm text-gray-600">
        {row.outcomeSource
          ? "Outcome reported by your host."
          : "Attendance is not confirmed when you open the meeting link."}
      </p>
      {row.canJoin ? (
        <button
          className={button}
          disabled={busy}
          onClick={async () => {
            if (joinLock.current || !alive.current || getAuthRevision() !== ownerRevision) return;
            joinLock.current = true;
            setBusy(true);
            setError("");
            setUrl("");
            try {
              const response = await apiClient.get<unknown>(
                `v2/human-interviews/me/${row.id}/join`
              );
              if (!alive.current || getAuthRevision() !== ownerRevision) return;
              const link = verifiedGoogleMeetUrl(response);
              if (!link) throw new Error("Invalid meeting link");
              setUrl(link);
            } catch {
              if (alive.current && getAuthRevision() === ownerRevision)
                setError(
                  "The meeting link could not be verified. Refresh to check the time and your enrollment, or contact your program team. No attendance or score was recorded."
                );
            } finally {
              joinLock.current = false;
              if (alive.current && getAuthRevision() === ownerRevision) setBusy(false);
            }
          }}
        >
          Check meeting access
        </button>
      ) : (
        ["scheduled", "rescheduled"].includes(row.status) && (
          <p className="text-sm text-gray-600">
            Joining opens {new Date(row.joinOpensAt).toLocaleString()} and closes at the scheduled
            end. Refresh when it is time.
          </p>
        )
      )}
      {url && (
        <div className="space-y-2">
          <a
            className={`${button} bg-black text-white`}
            href={url}
            onClick={(event) => {
              if (getAuthRevision() !== ownerRevision || Date.now() >= Date.parse(row.endsAt)) {
                event.preventDefault();
                setUrl("");
                setError(
                  "Meeting access has changed or the join window ended. Refresh appointments before trying again."
                );
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            Open Google Meet in a new tab
          </a>
          <p className="text-sm text-gray-600">
            Keep this page open. Your host admits you in {platform}; opening this link does not
            confirm attendance. Check the account shown in {platform} and allow camera and
            microphone access there. If disconnected, return here and check access again while the
            join window is open. If admission is denied or the host is absent, contact your program
            team.
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
  const query = apiClient.useQuery<unknown>({
    url: `v2/human-interviews/me?page=${page}`,
    key: ["human-interviews", accountKey, page],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const data = query.isError ? undefined : parseHumanInterviewsPage(query.data);
  const invalidResponse = !query.isError && !query.isLoading && query.data !== undefined && !data;
  return (
    <section
      aria-label="Your live interviews"
      className="mx-auto w-full max-w-4xl space-y-6 py-6 sm:py-10"
    >
      <PageHeading
        eyebrow="Talk to your interviewer"
        title="Your live interviews"
        description="See your interview time. Check your camera and microphone. Then join on Google Meet."
        action={
          <button
            className="ws-button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh
          </button>
        }
      />
      {query.isError || invalidResponse ? (
        <div role="alert">
          <p>
            Appointments could not be verified. Check your connection and sign-in, then refresh.
            Your program team can help verify enrollment.
          </p>
        </div>
      ) : query.isLoading || !data ? (
        <output>Checking your appointments…</output>
      ) : (
        <>
          <p className="text-sm text-gray-600">{data.notice}</p>
          {!data.items.length && (
            <div className="studio-panel">
              <h2 className="text-lg font-semibold text-[#1F285B]">No interviews yet</h2>
              <p className="mt-2 text-gray-600">
                Your teacher will set a time for you. You can keep practising.
              </p>
            </div>
          )}
          <ul className="space-y-4">
            {data.items.map((row) => (
              <AppointmentCard key={row.id} row={row} />
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
