"use client";

import PageHeading from "@/components/studio/PageHeading";
import {
  activitySummary,
  focusProgress,
  savedPracticeExpired,
  practiceReadinessMessage,
  type PracticeHubResponse,
} from "@/lib/practice-hub";
import { trackButtonClick } from "@/lib/posthog/tracking.utils";
import {
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
  MicrophoneIcon,
  SignalIcon,
  SparklesIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

const MODULES = [
  {
    key: "structure",
    title: "Plan your answers",
    description: "Say your idea, your reason and an example.",
    href: "/structure-your-answer",
    icon: ListBulletIcon,
  },
  {
    key: "pronunciation",
    title: "Pronunciation",
    description: "Practise saying words clearly.",
    href: "/pronunciation-practice",
    icon: MicrophoneIcon,
  },
  {
    key: "pace",
    title: "Speak at a good speed",
    description: "Pause. Say less 'um'.",
    href: "/control-your-pace",
    icon: SignalIcon,
  },
  {
    key: "warm_up",
    title: "Warm-up chat",
    description: "Practise the first two minutes of an interview.",
    href: "/warm-up-chat",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    key: "think_fast",
    title: "Think fast: 60 seconds",
    description: "Practise answering with no time to prepare.",
    href: "/think-fast",
    icon: BoltIcon,
  },
] as const;

export function PracticeHubSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl motion-safe:animate-pulse space-y-6"
      aria-label="Loading Practice"
    >
      <div className="h-20 rounded-2xl bg-gray-100" />
      <div className="h-64 rounded-xl bg-[#344499]/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-40 rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export function PracticeHubView({
  hub,
  status,
  onRefresh,
  children,
}: {
  hub: PracticeHubResponse | null;
  status: "loading" | "refreshing" | "ready" | "error";
  name: string;
  onRefresh: () => void;
  children?: React.ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const verified = status === "ready" ? hub : null;
  const expired = savedPracticeExpired(verified?.resume ?? null, now);
  const resume = !expired ? verified?.resume : null;
  const canResume = resume?.readiness === "ready";
  const readinessMessage = practiceReadinessMessage(resume?.readiness);
  const enoughEvidence =
    !!verified && verified.focusEvidenceAnswerCount >= verified.focusEvidenceRequired;
  const progress = verified
    ? focusProgress(verified.focusEvidenceAnswerCount, verified.focusEvidenceRequired)
    : 0;
  const primaryHref = resume
    ? canResume
      ? `/interview?interviewId=${resume.interviewId}&resumed=true&interviewMode=practice`
      : "/history"
    : status === "error"
      ? "/history"
      : "/interview-start?mode=practice";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl pb-8 text-[#111827] [overflow-wrap:anywhere]">
      <PageHeading
        eyebrow="Your practice space"
        title="Practice"
        description={
          verified
            ? activitySummary(verified.activity)
            : status === "error"
              ? "Your activity is unavailable right now."
              : "Checking your saved progress…"
        }
      />

      {status === "error" && (
        <section
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm text-amber-950">
            Your saved progress could not be verified. Check History for saved sessions, or try
            loading again. Independent skill builders remain available.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="min-h-11 rounded-xl border border-amber-400 px-4 font-semibold text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
          >
            Try again
          </button>
        </section>
      )}

      {(status === "loading" || status === "refreshing") && (
        <p role="status" className="mb-5 rounded-xl border border-[#DEE8FB] bg-white p-4 text-sm">
          Checking your latest coach plan. Your saved answers are retained.
        </p>
      )}
      {expired && (
        <p role="status" className="mb-5 rounded-xl border border-[#DEE8FB] bg-white p-4 text-sm">
          The saved session’s resume window has ended. Your submitted answers remain in History.
        </p>
      )}
      <nav
        aria-label="Practice shortcuts"
        className="mb-6 flex flex-wrap gap-3 text-sm font-semibold text-[#344499]"
      >
        <a
          href="#skill-builders-title"
          className="inline-flex min-h-11 items-center rounded-xl border border-[#DEE8FB] bg-white px-4 focus-visible:outline-2"
        >
          Choose a skill
        </a>
        <Link
          href="/history"
          className="inline-flex min-h-11 items-center rounded-xl border border-[#DEE8FB] bg-white px-4 focus-visible:outline-2"
        >
          Saved practice and feedback
        </Link>
      </nav>
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr]" aria-label="Practice plan">
        <div className="studio-panel">
          <div className="flex items-center gap-2 text-xs font-medium text-[#344499]">
            <SparklesIcon className="size-5" aria-hidden="true" />
            {resume
              ? canResume
                ? "Continue where you stopped"
                : "Saved practice"
              : status === "error"
                ? "Saved progress unavailable"
                : "Interview practice"}
          </div>
          <h2 className="mt-4 text-xl font-semibold sm:text-3xl">
            {resume
              ? canResume
                ? `Continue your ${resume.track} practice`
                : readinessMessage.title
              : status === "error"
                ? "Pick up your practice safely"
                : "Practice an interview"}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {resume
              ? !canResume
                ? readinessMessage.body
                : (resume.totalQuestions ?? 0) > 0
                  ? `${resume.answeredQuestions} of ${resume.totalQuestions} answers are saved. Your questions will stay in the same order.`
                  : "Your session is saved. Reopen it to check question preparation."
              : status === "error"
                ? "Open History to check your saved sessions before starting another round, or choose a skill builder below."
                : "Speak your answers and get tips from AI. First, check your microphone."}
          </p>
          {status === "loading" || status === "refreshing" ? (
            <p className="mt-7 text-sm">Your saved-session action will appear after this check.</p>
          ) : (
            <Link
              href={primaryHref}
              onClick={() =>
                trackButtonClick(
                  resume
                    ? canResume
                      ? "continue_practice_interview"
                      : "view_saved_practice"
                    : status === "error"
                      ? "find_saved_practice"
                      : "begin_mock_interview",
                  "practice_page"
                )
              }
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-black px-6 py-3 text-base font-semibold text-white transition hover:bg-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#344499] sm:w-auto"
            >
              {resume
                ? canResume
                  ? "Continue saved interview"
                  : "View saved session"
                : status === "error"
                  ? "Find saved interviews"
                  : "Start practice interview"}
            </Link>
          )}
          {resume && !canResume && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-4 flex min-h-11 items-center rounded-xl border border-[#C0CFF2] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
            >
              Check again
            </button>
          )}
          <p className="mt-4 text-sm text-gray-600">
            You will not lose your practice if you refresh the page.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#DEE8FB] bg-[#F5F9FF] p-6 sm:p-8">
          <p className="text-xs font-medium text-amber-900">This week&apos;s focus</p>
          {verified?.focus ? (
            <>
              <h2 className="mt-4 text-xl font-semibold">{verified?.focus.title}</h2>
              <p className="mt-2 leading-6 text-gray-700">{verified?.focus.reason}</p>
              <Link
                href={verified?.focus.href}
                className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[#1F285B] px-4 font-bold text-[#1F285B] transition hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
              >
                Practise this skill
              </Link>
            </>
          ) : verified ? (
            <>
              <h2 className="mt-4 text-lg font-semibold">
                {enoughEvidence ? "Keep exploring your skills" : "Build your feedback"}
              </h2>
              <p className="mt-2 leading-6 text-gray-700">
                {enoughEvidence
                  ? "There are enough saved answers to look for patterns, but no single focus stands out yet. Choose any skill below."
                  : `Give ${verified.focusEvidenceRequired} spoken answers. Then we will tell you what to practise next.`}
              </p>
              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-white/70"
                role="progressbar"
                aria-label="Evidence collected for personalised focus"
                aria-valuemin={0}
                aria-valuemax={verified.focusEvidenceRequired}
                aria-valuenow={Math.min(
                  verified.focusEvidenceAnswerCount,
                  verified.focusEvidenceRequired
                )}
              >
                <div
                  className="h-full rounded-full bg-[#344499]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-amber-950">
                {Math.min(verified.focusEvidenceAnswerCount, verified.focusEvidenceRequired)} of{" "}
                {verified.focusEvidenceRequired} saved answers
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-semibold">Choose one skill for today</h2>
              <p className="mt-2 leading-6 text-gray-700">
                Your suggested focus will appear after a few saved answers.
              </p>
            </>
          )}
        </div>
      </section>
      <div className="mt-7">{children}</div>

      <section className="mt-9" aria-labelledby="skill-builders-title">
        <div className="mb-4">
          <h2 id="skill-builders-title" className="text-xl font-semibold">
            Skill builders
          </h2>
          <p className="mt-1 text-gray-600">Short practice for one skill.</p>
        </div>
        <div className="ws-skill-grid">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.key}
                href={module.href}
                onClick={() => trackButtonClick(`practice_module_${module.key}`, "practice_page")}
                className="ws-skill-link"
              >
                <Icon aria-hidden="true" />
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                </div>
                <ChevronRightIcon aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
