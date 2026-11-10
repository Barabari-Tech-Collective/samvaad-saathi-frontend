"use client";

import PageHeading from "@/components/studio/PageHeading";
import {
  focusProgress,
  savedPracticeExpired,
  practiceReadinessMessage,
  type PracticeHubResponse,
} from "@/lib/practice-hub";
import { useLanguage } from "@/lib/i18n/language";
import { trackButtonClick } from "@/lib/posthog/tracking.utils";
import {
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
  MicrophoneIcon,
  SignalIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

export type LearningArea = "mock" | "coaching" | "legacy";
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

export function PracticeHubSkeleton({ area = "legacy" }: { area?: LearningArea }) {
  const label =
    area === "mock"
      ? "Loading Mock Interviews"
      : area === "coaching"
        ? "Loading Coaching"
        : "Loading your learning workspace";
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6 motion-safe:animate-pulse"
      aria-label={label}
      role="status"
    >
      <span className="sr-only">{label}</span>
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

function MockInterviewCard({
  hub,
  status,
  onRefresh,
}: {
  hub: PracticeHubResponse | null;
  status: "loading" | "refreshing" | "ready" | "error";
  onRefresh: () => void;
}) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const expired = savedPracticeExpired(hub?.resume ?? null, now);
  const resume = !expired ? hub?.resume : null;
  const canResume = resume?.readiness === "ready";
  const readiness = practiceReadinessMessage(resume?.readiness);
  const checking = status === "loading" || status === "refreshing";
  const primaryHref = resume
    ? canResume
      ? `/interview?interviewId=${resume.interviewId}&resumed=true&interviewMode=practice`
      : "/history"
    : status === "error"
      ? "/history"
      : "/interview-start?mode=practice";
  return (
    <section className="studio-panel space-y-4" aria-labelledby="mock-interview-start-title">
      <p className="studio-eyebrow">{t(resume ? "Saved Mock Interview" : "Mock Interviews")}</p>
      <h2 id="mock-interview-start-title" className="text-xl font-semibold sm:text-2xl">
        {resume
          ? canResume
            ? `Continue your ${resume.track} Mock Interview`
            : readiness.title
          : status === "error"
            ? "We couldn't load your interview"
            : t("Rehearse your next interview")}
      </h2>
      <p>
        {resume
          ? !canResume
            ? readiness.body
            : (resume.totalQuestions ?? 0) > 0
              ? `${resume.answeredQuestions} of ${resume.totalQuestions} answers are saved. Your questions will stay in the same order.`
              : "Your interview is saved."
          : status === "error"
            ? "Check Progress before starting another interview."
            : "Choose a job, speak your answers, and get feedback."}
      </p>
      {expired && (
        <p role="status">
          This interview can no longer be continued. Your answers are in Progress.
        </p>
      )}
      {checking ? (
        <output>Your answers are safe. Just a moment…</output>
      ) : (
        <Link
          className="ws-button ws-button-primary"
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
        >
          {resume
            ? canResume
              ? t("Continue Mock Interview")
              : "Open in Progress"
            : status === "error"
              ? "Open Progress"
              : t("Start Mock Interview")}
        </Link>
      )}
      {resume && !canResume && (
        <button type="button" className="ws-button" onClick={onRefresh}>
          Check again
        </button>
      )}
      <p className="text-sm">
        This is only practice and never counts.
      </p>
    </section>
  );
}

function CoachingFocus({ hub }: { hub: PracticeHubResponse | null }) {
  const { t } = useLanguage();
  if (!hub || hub.focus) return null;
  const left = hub.focusEvidenceRequired - hub.focusEvidenceAnswerCount;
  if (left <= 0) return null;
  return (
    <section className="ws-focus-note" aria-label={t("Your suggestion")}>
      <p>
        {left === 1
          ? t("One more answer and we can suggest what to practise")
          : `${left} ${t("more answers and we can suggest what to practise")}`}
      </p>
      <progress
        className="w-full"
        aria-hidden="true"
        value={Math.min(hub.focusEvidenceAnswerCount, hub.focusEvidenceRequired)}
        max={hub.focusEvidenceRequired}
      />
    </section>
  );
}

export function PracticeHubView({
  hub,
  status,
  onRefresh,
  children,
  area = "legacy",
  top,
}: {
  hub: PracticeHubResponse | null;
  status: "loading" | "refreshing" | "ready" | "error";
  name: string;
  onRefresh: () => void;
  children?: React.ReactNode;
  area?: LearningArea;
  top?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const verified = status === "ready" ? hub : null;
  const showMock = area !== "coaching";
  const showCoaching = area !== "mock";
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 pb-8 [overflow-wrap:anywhere]">
      <PageHeading
                title={t("Practice")}
        description={
          area === "mock"
            ? "Rehearse a full interview and get feedback."
            : "Short activities that build one skill at a time."
        }
      />
      <nav aria-label={t("Practice sections")} className="ws-tabs">
        <Link href="/coaching" aria-current={area !== "mock" ? "page" : undefined}>
          {t("Short activities")}
        </Link>
        <Link href="/mock-interviews" aria-current={area === "mock" ? "page" : undefined}>
          {t("Mock Interviews")}
        </Link>
      </nav>
      {status === "error" && (
        <div role="status" className="studio-panel space-y-3">
          <p>{t("We couldn't load your practice. Your work is safe.")}</p>
          <button type="button" className="ws-button" onClick={onRefresh}>
            {t("Try again")}
          </button>
        </div>
      )}
      {top}
      {showMock && <MockInterviewCard hub={verified} status={status} onRefresh={onRefresh} />}
      {showCoaching && (
        <>
          <h2 className="text-xl font-semibold">{t("More practice")}</h2>
          {children}
          <CoachingFocus hub={verified} />
          <section aria-labelledby="skill-builders-title">
            <div className="mb-4 space-y-1">
              <h3 id="skill-builders-title" className="text-lg font-semibold">
                {t("Choose a short activity")}
              </h3>
            </div>
            <div className="ws-skill-grid">
              {MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.key}
                    href={module.href}
                    className="ws-skill-link"
                    onClick={() =>
                      trackButtonClick(`practice_module_${module.key}`, "practice_page")
                    }
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
        </>
      )}
    </div>
  );
}
