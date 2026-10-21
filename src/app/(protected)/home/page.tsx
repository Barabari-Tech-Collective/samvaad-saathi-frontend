"use client";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";

interface InterviewItem {
  interviewId: number;
  track: string;
  difficulty: string;
  status: string;
  createdAt: string;
  summaryReportAvailable: boolean;
}
export default function HomePage() {
  const { user, loading } = useAuth();
  const account = user?.userId;
  const query = apiClient.useQuery<{ items: InterviewItem[] }>({
    key: [ENDPOINTS.INTERVIEWS.WITH_SUMMARY, "home", account],
    url: `${ENDPOINTS.INTERVIEWS.WITH_SUMMARY}?limit=3`,
    enabled: !!account && !loading,
    options: { staleTime: 0, gcTime: 0, retry: false },
  });
  const data = query.isError || query.isFetching ? undefined : query.data;
  if (loading || !account) return <output>Checking your workspace…</output>;
  return (
    <div className="space-y-8 py-3 sm:py-5">
      <header className="space-y-3">
        <p className="workspace-eyebrow">YOUR NEXT STEP</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Make room for your next opportunity.</h1>
        <p className="max-w-2xl text-gray-600">
          Welcome, {user.authorizedUser.name.split(" ")[0]}. Practise at your pace, prepare for an
          assessment or meet your interviewer.
        </p>
      </header>
      <section aria-label="Choose your next step" className="grid gap-4 md:grid-cols-3">
        <article className="flex flex-col gap-4 rounded-3xl bg-[#1F285B] p-6 text-white">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#FFCC33]">
            BUILD CONFIDENCE
          </span>
          <h2 className="text-2xl font-semibold">Practice, your way.</h2>
          <p className="flex-1 text-sm leading-relaxed text-[#DEE8FB]">
            Work on clear answers, English communication, pacing and interview skills.
          </p>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FFCC33] px-4 font-semibold text-[#1F285B]"
            href="/practice"
          >
            Open practice coach
          </Link>
          <Link
            className="min-h-11 py-2 text-sm text-white underline underline-offset-4"
            href="/interview-start?mode=practice"
          >
            Start a practice interview
          </Link>
        </article>
        <article className="flex flex-col gap-4 rounded-3xl border border-[#DEE8FB] bg-white p-6">
          <span className="workspace-eyebrow">YOUR ASSESSMENT</span>
          <h2 className="text-2xl font-semibold text-[#1F285B]">Show what you can do.</h2>
          <p className="flex-1 text-sm leading-relaxed text-gray-600">
            Open your available assessment, review the instructions and check your microphone before
            starting.
          </p>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-4 font-semibold text-white"
            href="/interview-start?mode=assessment"
          >
            Find an assessment
          </Link>
        </article>
        <article className="flex flex-col gap-4 rounded-3xl border border-[#DEE8FB] bg-white p-6">
          <span className="workspace-eyebrow">A HUMAN CONVERSATION</span>
          <h2 className="text-2xl font-semibold text-[#1F285B]">Meet your interviewer.</h2>
          <p className="flex-1 text-sm leading-relaxed text-gray-600">
            Check your scheduled human interviews and join Google Meet when it is time.
          </p>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#C0CFF2] px-4 font-semibold text-[#344499]"
            href="/human-interviews"
          >
            View human interviews
          </Link>
        </article>
      </section>
      <section aria-labelledby="recent-interviews" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="workspace-eyebrow">KEEP MOVING FORWARD</p>
            <h2 id="recent-interviews" className="mt-2 text-2xl font-semibold text-[#1F285B]">
              Pick up where you left off
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[#344499] underline"
            href="/history"
          >
            View all history
          </Link>
        </div>
        {query.isError ? (
          <div role="alert" className="rounded-2xl bg-white p-5">
            <p>Your recent interviews could not be loaded. Your saved work is retained.</p>
            <button
              className="mt-3 font-semibold text-[#344499] underline"
              onClick={() => void query.refetch()}
            >
              Retry recent interviews
            </button>
          </div>
        ) : !data ? (
          <output>Loading recent interviews…</output>
        ) : !data.items.length ? (
          <p className="rounded-2xl border border-[#DEE8FB] bg-white p-6 text-gray-600">
            Your saved interviews will appear here. Choose a practice skill to begin.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((row) => (
              <li
                key={row.interviewId}
                className="space-y-4 rounded-2xl border border-[#DEE8FB] bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#F5F9FF] px-3 py-1 text-xs font-medium text-[#344499]">
                    {row.status.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-gray-600">{row.difficulty}</span>
                </div>
                <h3 className="text-lg font-semibold text-[#1F285B]">{row.track}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(row.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <Link
                  className="inline-flex min-h-11 items-center font-semibold text-[#344499] underline"
                  href={
                    row.status === "completed" && row.summaryReportAvailable
                      ? `/report-summary?interviewId=${row.interviewId}`
                      : "/history"
                  }
                >
                  {row.status === "completed" && row.summaryReportAvailable
                    ? "Review feedback"
                    : "Open saved interview"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DEE8FB] bg-white p-5">
        <div>
          <h2 className="font-semibold text-[#1F285B]">Prepare your story, too.</h2>
          <p className="mt-1 text-sm text-gray-600">
            Build a resume that reflects your experience and skills.
          </p>
        </div>
        <Link
          href="/ai-resume"
          className="inline-flex min-h-11 items-center font-semibold text-[#344499] underline"
        >
          Open resume builder
        </Link>
      </aside>
    </div>
  );
}
