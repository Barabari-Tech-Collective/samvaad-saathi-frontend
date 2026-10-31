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
            ? "Find your saved interview"
            : t("Rehearse your next interview")}
      </h2>
      <p>
        {resume
          ? !canResume
            ? readiness.body
            : (resume.totalQuestions ?? 0) > 0
              ? `${resume.answeredQuestions} of ${resume.totalQuestions} answers are saved. Your questions will stay in the same order.`
              : "Your session is saved. Reopen it to check question preparation."
          : status === "error"
            ? "Open History to check your saved sessions before starting another round."
            : "Choose a role, check your microphone, and speak your answers. Review feedback after the round."}
      </p>
      {expired && (
        <p role="status">
          The saved session’s resume window has ended. Your submitted answers remain in History.
        </p>
      )}
      {checking ? (
        <output>Checking your saved Mock Interview. Your saved answers are retained.</output>
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
              : "View saved session"
            : status === "error"
              ? "Find saved interviews"
              : t("Start Mock Interview")}
        </Link>
      )}
      {resume && !canResume && (
        <button type="button" className="ws-button" onClick={onRefresh}>
          Check again
        </button>
      )}
      <p className="text-sm">
        This is interview rehearsal. Formal assessments have their own instructions and rules.
      </p>
    </section>
  );
}

function CoachingFocus({ hub }: { hub: PracticeHubResponse | null }) {
  const enoughEvidence = !!hub && hub.focusEvidenceAnswerCount >= hub.focusEvidenceRequired;
  const progress = hub ? focusProgress(hub.focusEvidenceAnswerCount, hub.focusEvidenceRequired) : 0;
  return (
    <section className="studio-panel space-y-4" aria-labelledby="coaching-focus-title">
      <p className="studio-eyebrow">Suggested focus</p>
      {hub?.focus ? (
        <>
          <h2 id="coaching-focus-title" className="text-xl font-semibold">
            {hub.focus.title}
          </h2>
          <p>{hub.focus.reason}</p>
          <Link className="ws-button" href={hub.focus.href}>
            Practise this skill
          </Link>
        </>
      ) : hub ? (
        <>
          <h2 id="coaching-focus-title" className="text-xl font-semibold">
            {enoughEvidence ? "Keep exploring your skills" : "Build your feedback"}
          </h2>
          <p>
            {enoughEvidence
              ? "There are enough saved answers to look for patterns, but no single focus stands out yet. Choose any skill below."
              : `A suggestion needs at least ${hub.focusEvidenceRequired} valid spoken answers. You can choose any Coaching activity while you build that evidence.`}
          </p>
          <progress
            className="w-full"
            aria-label="Evidence collected for personalised focus"
            value={Math.min(hub.focusEvidenceAnswerCount, hub.focusEvidenceRequired)}
            max={hub.focusEvidenceRequired}
          />
          <p className="text-sm">
            {Math.min(hub.focusEvidenceAnswerCount, hub.focusEvidenceRequired)} of{" "}
            {hub.focusEvidenceRequired} saved answers · {progress}% of the minimum evidence
          </p>
        </>
      ) : (
        <>
          <h2 id="coaching-focus-title" className="text-xl font-semibold">
            Choose one skill for today
          </h2>
          <p>
            Your saved evidence is not available yet. Choose an activity below; a personalised
            suggestion is optional.
          </p>
        </>
      )}
    </section>
  );
}

export function PracticeHubView({
  hub,
  status,
  onRefresh,
  children,
  area = "legacy",
}: {
  hub: PracticeHubResponse | null;
  status: "loading" | "refreshing" | "ready" | "error";
  name: string;
  onRefresh: () => void;
  children?: React.ReactNode;
  area?: LearningArea;
}) {
  const { t } = useLanguage();
  const verified = status === "ready" ? hub : null;
  const showMock = area !== "coaching";
  const showCoaching = area !== "mock";
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 pb-8 [overflow-wrap:anywhere]">
      <PageHeading
        eyebrow={t("Your learning workspace")}
        title={
          area === "mock"
            ? t("Mock Interviews")
            : area === "coaching"
              ? t("Coaching")
              : "Coaching and Mock Interviews"
        }
        description={
          area === "mock"
            ? "Rehearse a full interview and learn from feedback. This is separate from formal assessments."
            : area === "coaching"
              ? "Build one skill at a time with short activities, feedback and assignments."
              : "Choose Coaching for focused skills or Mock Interviews for a full interview rehearsal."
        }
      />
      <nav aria-label="Learning shortcuts" className="flex flex-wrap gap-3">
        {area !== "coaching" && (
          <Link className="ws-button" href="/coaching">
            {t("Coaching")}
          </Link>
        )}
        {area !== "mock" && (
          <Link className="ws-button" href="/mock-interviews">
            {t("Mock Interviews")}
          </Link>
        )}
        <Link className="ws-button" href="/history">
          Saved interviews and feedback
        </Link>
      </nav>
      {status === "error" && (
        <div role="status" className="studio-panel space-y-3">
          <p>
            Your saved activity could not be verified. Try again or check History.
            {showCoaching ? " Coaching activities remain available." : ""}
          </p>
          <button type="button" className="ws-button" onClick={onRefresh}>
            Try again
          </button>
        </div>
      )}
      {showCoaching && (status === "loading" || status === "refreshing") && (
        <output>Checking your saved evidence for Coaching…</output>
      )}
      <div className={area === "legacy" ? "grid gap-5 lg:grid-cols-2" : "space-y-5"}>
        {showMock && <MockInterviewCard hub={verified} status={status} onRefresh={onRefresh} />}
        {showCoaching && <CoachingFocus hub={verified} />}
      </div>
      {showCoaching && (
        <>
          {children}
          <section aria-labelledby="skill-builders-title">
            <div className="mb-4 space-y-1">
              <h2 id="skill-builders-title" className="text-xl font-semibold">
                Coaching activities
              </h2>
              <p>Choose a short activity for the skill you want to work on.</p>
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
