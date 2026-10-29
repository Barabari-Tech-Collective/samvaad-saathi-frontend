"use client";
import React from "react";

interface WelcomeProps {
  role: string;
  plannedQuestionCount?: number | null;
  onInterviewStart: () => void;
  isPreparing: boolean;
  blocked?: boolean;
  mode?: "practice" | "assessment";
}

const Welcome = ({
  role,
  onInterviewStart,
  isPreparing,
  blocked = false,
  mode = "practice",
  plannedQuestionCount = null,
}: WelcomeProps) => {
  const isPractice = mode === "practice";
  return (
    <div className="studio-welcome">
      <p className="studio-eyebrow">{isPractice ? "Practice interview" : "Formal assessment"}</p>
      <h1 className="mt-3">Ready for your {role} interview?</h1>
      <div className="studio-welcome-meta">
        {plannedQuestionCount !== null && <span>{plannedQuestionCount} questions</span>}
        <span>
          {isPractice && plannedQuestionCount !== null
            ? "No time limit"
            : `${plannedQuestionCount !== null ? plannedQuestionCount * 3 : 25} minutes`}
        </span>
        <span>Spoken answers</span>
      </div>
      <section className="studio-panel">
        <h2 className="text-lg font-semibold">Before you begin</h2>
        <ul className="space-y-2 text-gray-800 font-medium text-md leading-relaxed list-disc pl-5 marker:text-gray-800">
          {isPractice ? (
            <>
              <li>This is a low-pressure practice interview, not an exam.</li>
              <li>
                Answer by voice. If your microphone is unavailable, check its permissions before
                starting.
              </li>
              <li>Your saved answers stay attached to the same questions.</li>
              <li>You may refresh or reconnect. We will resume from the first unsaved answer.</li>
            </>
          ) : (
            <>
              <li>This is a formal assessment interview.</li>
              <li>Complete it in one sitting and follow the disclosed monitoring rules.</li>
              <li>
                Tab changes or fullscreen exits may be recorded for review; they do not
                automatically end the assessment. Your timer continues.
              </li>
              <li>Your submitted answers remain saved if feedback processing is delayed.</li>
            </>
          )}
        </ul>

        <div className="mt-6">
          <button
            onClick={onInterviewStart}
            className="btn btn-primary px-8 text-lg"
            disabled={isPreparing || blocked}
          >
            {isPreparing
              ? "Preparing interview…"
              : isPractice
                ? "Begin practice interview"
                : "Begin assessment"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default Welcome;
