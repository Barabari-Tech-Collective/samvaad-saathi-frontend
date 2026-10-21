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
    <div className="">
      <div className="flex-1">
        <h3 className="text-primary text-2xl font-bold tracking-wide uppercase">{role}</h3>
      </div>

      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 py-12">
        {/* Heading */}
        <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight text-center">
          Welcome to {role} Interview
        </h2>

        {/* Duration Card */}
        <div className="card bg-blue-50 border border-blue-500 shadow-sm w-full max-w-xs">
          <div className="card-body items-center text-center py-6">
            <h3 className="card-title text-xl font-medium text-gray-900">Interview Duration</h3>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-semibold text-gray-900">
                {isPractice && plannedQuestionCount !== null
                  ? "No time limit"
                  : `${plannedQuestionCount !== null ? plannedQuestionCount * 3 : 25} minutes`}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="card bg-[#EFEEF6] w-full rounded-xl">
          <div className="card-body px-8 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              Instructions
            </h3>
            <ul className="space-y-2 text-gray-800 font-medium text-md leading-relaxed list-disc pl-5 marker:text-gray-800">
              {isPractice ? (
                <>
                  <li>This is a low-pressure practice interview, not an exam.</li>
                  <li>
                    Answer by voice. If your microphone is unavailable, check its permissions before
                    starting.
                  </li>
                  <li>Your saved answers stay attached to the same questions.</li>
                  <li>
                    You may refresh or reconnect. We will resume from the first unsaved answer.
                  </li>
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

            <div className="mt-6 flex justify-center">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
