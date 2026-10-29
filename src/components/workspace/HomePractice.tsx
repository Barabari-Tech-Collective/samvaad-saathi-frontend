"use client";

import VoiceMark from "@/components/studio/VoiceMark";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, MicrophoneIcon } from "@heroicons/react/24/outline";
import { trackButtonClick } from "@/lib/posthog/tracking.utils";
import { apiClient, ENDPOINTS } from "@/lib/api-config";
import {
  parsePracticeHub,
  practiceReadinessMessage,
  savedPracticeExpired,
} from "@/lib/practice-hub";

/** A saved round must be verified before offering a direct resume or a new round. */
export default function HomePractice({ accountKey }: { accountKey: string }) {
  const query = apiClient.useQuery<unknown>({
    key: [ENDPOINTS.PRACTICE.HUB, accountKey],
    url: ENDPOINTS.PRACTICE.HUB,
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const checking = query.isLoading || query.isFetching;
  const hub = checking || query.isError ? null : parsePracticeHub(query.data);
  const expired = savedPracticeExpired(hub?.resume ?? null, now);
  const resume = expired ? null : hub?.resume;
  const ready = resume?.readiness === "ready";
  const message = practiceReadinessMessage(resume?.readiness);
  const href = resume
    ? ready
      ? `/interview?interviewId=${resume.interviewId}&resumed=true&interviewMode=practice`
      : "/practice"
    : hub
      ? "/interview-start?mode=practice"
      : "/history";
  return (
    <article className="ws-practice-card" aria-labelledby="home-practice-title">
      <VoiceMark />
      <div className="ws-card-heading">
        <span className="ws-feature-icon">
          <MicrophoneIcon aria-hidden="true" />
        </span>
        <span className="ws-card-kicker">{resume ? "Saved practice" : "Interview practice"}</span>
      </div>
      <div>
        <h2 id="home-practice-title">
          {resume
            ? ready
              ? `Continue ${resume.track}`
              : message.title
            : "Practise your next interview"}
        </h2>
        <p>
          {checking
            ? "Checking for a saved round…"
            : resume
              ? ready
                ? `${resume.answeredQuestions} of ${resume.totalQuestions} answers saved · ${resume.difficulty}`
                : message.body
              : !hub
                ? "Your saved sessions could not be checked. Open History before starting a new round."
                : expired
                  ? "Your previous round’s resume window has ended. Its saved answers are in History."
                  : "Choose a role, check your microphone, then answer out loud. Get feedback after your round."}
        </p>
      </div>
      <div className="ws-action-row">
        {checking ? (
          <output>Loading your next step…</output>
        ) : (
          <Link
            className="ws-button ws-button-primary"
            href={href}
            onClick={() =>
              trackButtonClick(
                ready
                  ? "continue_practice_interview"
                  : resume
                    ? "view_saved_practice"
                    : hub
                      ? "begin_mock_interview"
                      : "find_saved_practice",
                "home_page"
              )
            }
          >
            {resume
              ? ready
                ? "Continue interview"
                : "Check saved practice"
              : hub
                ? "Set up an interview"
                : "Check saved sessions"}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        )}
        {!checking && !hub && (
          <button className="ws-button" type="button" onClick={() => void query.refetch()}>
            Try again
          </button>
        )}
      </div>
      {!resume && hub && (
        <ol className="ws-round-steps" aria-label="Practice interview steps">
          <li>
            <span>1</span>Choose &amp; check mic
          </li>
          <li>
            <span>2</span>Speak your answers
          </li>
          <li>
            <span>3</span>Review feedback
          </li>
        </ol>
      )}
      {hub?.focus && (
        <Link className="ws-focus-link" href={hub.focus.href}>
          <span>
            <strong>Suggested skill: {hub.focus.title}</strong>
            <small>{hub.focus.reason}</small>
          </span>
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}
