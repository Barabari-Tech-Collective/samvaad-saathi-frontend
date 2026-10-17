"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { apiClient, ENDPOINTS } from "@/lib/api-config";
import {
  activitySummary,
  firstName,
  focusProgress,
  type PracticeHubResponse,
} from "@/lib/practice-hub";
import { trackButtonClick, trackEvent } from "@/lib/posthog/tracking.utils";
import {
  BoltIcon,
  ChatBubbleLeftRightIcon,
  FireIcon,
  ListBulletIcon,
  MicrophoneIcon,
  SignalIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect } from "react";

const EMPTY_HUB: PracticeHubResponse = {
  activity: {
    practiceDaysStreak: 0,
    completedMocksThisWeek: 0,
    completedDrillsThisWeek: 0,
  },
  resume: null,
  focus: null,
  focusEvidenceAnswerCount: 0,
  focusEvidenceRequired: 3,
};

const MODULES = [
  {
    key: "structure",
    title: "Structure your answers",
    description: "Frame ideas with clarity, logic and proof.",
    href: "/structure-your-answer",
    icon: ListBulletIcon,
  },
  {
    key: "pronunciation",
    title: "Pronunciation",
    description: "Make important words easier to understand.",
    href: "/pronunciation-practice",
    icon: MicrophoneIcon,
  },
  {
    key: "pace",
    title: "Control your pace",
    description: "Use pauses and reduce filler words.",
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
    title: "Think fast: 60-second topics",
    description: "Build confidence answering without preparation.",
    href: "/think-fast",
    icon: BoltIcon,
  },
] as const;

function PracticeHubSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6" aria-label="Loading Practice">
      <div className="h-20 rounded-2xl bg-gray-100" />
      <div className="h-64 rounded-3xl bg-[#344499]/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-40 rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default function PracticePage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = apiClient.useQuery<PracticeHubResponse>({
    key: [ENDPOINTS.PRACTICE.HUB],
    url: ENDPOINTS.PRACTICE.HUB,
    options: { staleTime: 60_000, retry: 1 },
  });

  useEffect(() => {
    trackEvent("practice_hub_viewed");
  }, []);

  if (isLoading) return <PracticeHubSkeleton />;

  const hub = data ?? EMPTY_HUB;
  const name = firstName(user?.authorizedUser.name);
  const progress = focusProgress(hub.focusEvidenceAnswerCount, hub.focusEvidenceRequired);
  const primaryHref = hub.resume
    ? `/interview?interviewId=${hub.resume.interviewId}&resumed=true&interviewMode=practice`
    : "/interview-start?mode=practice";

  return (
    <div className="mx-auto w-full max-w-6xl pb-8 text-[#111827]">
      <header className="mb-7">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#344499]">
          Your practice coach
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Keep building your edge, {name}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-base text-gray-600">
          <FireIcon className="size-5 shrink-0 text-amber-500" aria-hidden="true" />
          <span>{activitySummary(hub.activity)}</span>
        </p>
      </header>

      {isError && (
        <section
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm text-amber-950">
            Your latest coach plan could not be loaded. You can still start every practice activity.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 rounded-xl border border-amber-400 px-4 font-semibold text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
          >
            Try again
          </button>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr]" aria-label="Practice plan">
        <div className="rounded-3xl bg-[#344499] p-6 text-white shadow-[0_18px_50px_rgba(52,68,153,0.2)] sm:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[#FFCC33]">
            <SparklesIcon className="size-5" aria-hidden="true" />
            {hub.resume ? "Continue where you stopped" : "Mock interview"}
          </div>
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
            {hub.resume
              ? `Continue your ${hub.resume.track} practice`
              : "Start a full practice sitting"}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-blue-50">
            {hub.resume
              ? `${hub.resume.answeredQuestions} of ${hub.resume.totalQuestions} answers are saved. Your questions will stay in the same order.`
              : "A private, low-pressure interview with recoverable answers and AI coaching after you finish."}
          </p>
          <Link
            href={primaryHref}
            onClick={() =>
              trackButtonClick(
                hub.resume ? "continue_practice_interview" : "begin_mock_interview",
                "practice_page"
              )
            }
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#FFCC33] px-6 text-base font-bold text-[#1F285B] transition hover:bg-[#FFB800] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto"
          >
            {hub.resume ? "Continue saved interview" : "Begin mock interview"}
          </Link>
          <p className="mt-4 text-sm text-blue-100">
            Refreshing or changing tabs will not end a Practice interview.
          </p>
        </div>

        <div className="rounded-3xl bg-[#FFE4BF] p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-900">
            This week&apos;s focus
          </p>
          {hub.focus ? (
            <>
              <h2 className="mt-4 text-2xl font-bold">{hub.focus.title}</h2>
              <p className="mt-2 leading-6 text-gray-700">{hub.focus.reason}</p>
              <Link
                href={hub.focus.href}
                className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[#1F285B] px-4 font-bold text-[#1F285B] transition hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
              >
                Practise this skill
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-bold">Your personalised focus is taking shape</h2>
              <p className="mt-2 leading-6 text-gray-700">
                Complete at least {hub.focusEvidenceRequired} spoken or typed answers. We only
                recommend a focus when there is enough evidence.
              </p>
              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-white/70"
                role="progressbar"
                aria-label="Evidence collected for personalised focus"
                aria-valuemin={0}
                aria-valuemax={hub.focusEvidenceRequired}
                aria-valuenow={Math.min(hub.focusEvidenceAnswerCount, hub.focusEvidenceRequired)}
              >
                <div
                  className="h-full rounded-full bg-[#344499]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-amber-950">
                {Math.min(hub.focusEvidenceAnswerCount, hub.focusEvidenceRequired)} of{" "}
                {hub.focusEvidenceRequired} saved answers
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="skill-builders-title">
        <div className="mb-4">
          <h2 id="skill-builders-title" className="text-2xl font-bold">
            Skill builders
          </h2>
          <p className="mt-1 text-gray-600">
            Short practice for the part you want to improve today.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module, index) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.key}
                href={module.href}
                onClick={() => trackButtonClick(`practice_module_${module.key}`, "practice_page")}
                className={`group min-h-40 rounded-2xl border border-[#D6E0FB] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#344499] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] ${
                  index === 4 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <Icon className="size-8 text-[#344499]" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-bold group-hover:text-[#344499]">
                  {module.title}
                </h3>
                <p className="mt-1 leading-6 text-gray-600">{module.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
