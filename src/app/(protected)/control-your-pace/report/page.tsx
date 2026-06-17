"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import type { PacingSessionDetailResponse } from "@/lib/pacing-practice/types";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const getStatusBadge = (status: string) => {
  const statusLower = status?.toLowerCase() ?? "";
  if (statusLower === "good" || statusLower === "success") {
    return { label: "Good", class: "badge-success", icon: CheckCircleIcon };
  }
  if (
    statusLower === "needs adjustment" ||
    statusLower === "warning" ||
    statusLower === "needs_adjustment"
  ) {
    return {
      label: "Needs Adjustment",
      class: "badge-warning",
      icon: ExclamationTriangleIcon,
    };
  }
  if (statusLower === "average" || statusLower === "needs improvement") {
    return {
      label: statusLower === "average" ? "Average" : "Needs Improvement",
      class: "badge-warning",
      icon: ChartBarIcon,
    };
  }
  if (statusLower === "error" || statusLower === "poor") {
    return {
      label: "Needs Improvement",
      class: "badge-error",
      icon: ExclamationTriangleIcon,
    };
  }
  return { label: status || "—", class: "badge-soft", icon: ChartBarIcon };
};

const UNLOCK_THRESHOLD = 90;

/** Card border + optional subtle bg by status (Good = green, Needs Adjustment = amber, Poor = red) */
function getStatusCardBorder(status: string): string {
  const s = status?.toLowerCase()?.trim() ?? "";
  if (s === "good" || s === "success") return "border-2 border-green-300";
  if (
    ["needs adjustment", "needs_adjustment", "average", "needs improvement", "warning"].includes(s)
  )
    return "border-2 border-amber-300";
  if (s === "poor" || s === "error") return "border-2 border-red-300 bg-red-50";
  return "border-2 border-gray-200 bg-white";
}

const POOR_SPEECH_STATUSES = ["needs adjustment", "needs_adjustment", "poor", "error"] as const;

function getSpeechSpeedFeedback(speechSpeed: { status?: string; feedback?: string }) {
  const status = speechSpeed?.status?.toLowerCase() ?? "";
  const isGood = status === "good";
  const isPoor = POOR_SPEECH_STATUSES.includes(status as (typeof POOR_SPEECH_STATUSES)[number]);
  const boxClass = isGood
    ? "border border-green-200 bg-green-50"
    : isPoor
      ? "border border-red-200 bg-red-50"
      : "border border-amber-200 bg-amber-50";
  const textClass = isGood ? "text-gray-800" : isPoor ? "text-red-900" : "text-amber-900";
  const message =
    speechSpeed?.feedback?.trim() || "Your speaking pace is within the ideal range for interviews.";
  return { boxClass, textClass, message };
}

/** Count occurrences of each filler word for display e.g. "Um"(2), "Uh"(1) */
function getFillerCounts(fillersFound: string[]): { word: string; count: number }[] {
  const map = new Map<string, number>();
  for (const w of fillersFound) {
    const key = w.trim().toLowerCase();
    if (!key) continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([word, count]) => ({ word, count }));
}

const ReportPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const apiClient = createApiClient(APIService.PACING);
  const { data, isLoading, error } = apiClient.useQuery<PacingSessionDetailResponse>({
    key: ["pacing-session", sessionId],
    url: sessionId ? ENDPOINTS.PACING.SESSION_GET(sessionId) : "",
    enabled: Boolean(sessionId),
  });

  useEffect(() => {
    // redirect to levels if no session id
    if (!sessionId) {
      router.replace("/control-your-pace/levels");
    }
  }, [sessionId]);

  if (!sessionId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full bg-base-200/30 items-center justify-center p-6">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base text-gray-600 mt-4">Loading report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col min-h-full bg-base-200/30 items-center justify-center p-6">
        <p className="text-gray-600">Failed to load report. Please try again.</p>
        <Link href="/control-your-pace/levels" className="btn btn-neutral btn-sm mt-4">
          Back to Levels
        </Link>
      </div>
    );
  }

  const { score, speechSpeed, pauseDistribution, fillerWords, level } = data;
  const scoreLabelDisplay = data.scoreLabel ?? "Keep Practicing";

  const nextLevel = level < 3 ? level + 1 : null;
  const unlockedNextLevel = nextLevel !== null && score >= UNLOCK_THRESHOLD;
  const pointsNeeded = nextLevel !== null && !unlockedNextLevel ? UNLOCK_THRESHOLD - score : 0;

  const scoreSubtitle = unlockedNextLevel
    ? "Great! You have unlocked the next level"
    : nextLevel
      ? `Almost there. You need ${pointsNeeded} more point${pointsNeeded === 1 ? "" : "s"} to unlock level ${nextLevel}`
      : scoreLabelDisplay;

  const speechBadge = getStatusBadge(speechSpeed?.status ?? "");
  const pauseBadge = getStatusBadge(pauseDistribution?.status ?? "");
  const fillerBadge = getStatusBadge(fillerWords?.status ?? "");
  const SpeechIcon = speechBadge.icon;
  const PauseIcon = pauseBadge.icon;
  const FillerIcon = fillerBadge.icon;

  const speechSpeedFeedback = getSpeechSpeedFeedback(speechSpeed);

  return (
    <div className="flex flex-col min-h-full bg-base-200/30">
      <div className="p-6 space-y-6">
        {/* Your Score Card */}
        <div className="card bg-blue-600 text-white p-8 text-center shadow-lg rounded-3xl">
          <p className="text-base font-medium opacity-80 mb-2">Your Score</p>
          <div className="text-7xl font-bold mb-4">{score}</div>
          <p className="text-base font-medium opacity-80">{scoreSubtitle}</p>
        </div>

        {/* Level unlock message - color by performance */}
        {nextLevel !== null && (
          <div
            className={`p-4 rounded-2xl border-2 ${
              unlockedNextLevel ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {unlockedNextLevel ? (
                <LockOpenIcon className="w-5 h-5 text-green-600 shrink-0" />
              ) : (
                <LockClosedIcon className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <h3
                className={`font-semibold text-base ${
                  unlockedNextLevel ? "text-green-800" : "text-amber-800"
                }`}
              >
                {unlockedNextLevel
                  ? `Level ${nextLevel} has been unlocked`
                  : `Level ${nextLevel} unlocks at ${UNLOCK_THRESHOLD}%`}
              </h3>
            </div>
            <p
              className={`text-base pl-6 ${unlockedNextLevel ? "text-green-700" : "text-amber-700"}`}
            >
              {unlockedNextLevel
                ? `Go to level ${nextLevel} to practice at a harder level and unlock new challenges.`
                : "Keep practicing to improve your score and unlock the next level!"}
            </p>
          </div>
        )}

        {/* Speech Speed (WPM) */}
        <div
          className={`card shadow-sm p-5 rounded-2xl ${getStatusCardBorder(speechSpeed.status)}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-black text-lg">Speech Speed (WPM)</h3>
            <span
              className={`badge rounded-full text-base font-bold py-2 px-3 gap-1 ${speechBadge.class === "badge-success" ? "bg-green-100 text-green-700" : speechBadge.class === "badge-warning" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}
            >
              <SpeechIcon className="w-4 h-4 inline" />
              {speechBadge.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-bold text-black">{speechSpeed?.value}</span>
            <span className="text-base text-gray-400">/ {speechSpeed?.idealRange}</span>
          </div>
          <div className={`p-3 rounded-xl ${speechSpeedFeedback.boxClass}`}>
            <p className={`text-base leading-tight ${speechSpeedFeedback.textClass}`}>
              {speechSpeedFeedback.message}
            </p>
          </div>
        </div>

        {/* Pause Distribution */}
        <div
          className={`card shadow-sm p-5 rounded-2xl ${getStatusCardBorder(pauseDistribution.status)}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-black text-lg">Pause Distribution</h3>
            <span
              className={`badge rounded-full text-base font-bold py-2 px-3 gap-1 ${pauseBadge.class === "badge-success" ? "bg-green-100 text-green-700" : pauseBadge.class === "badge-warning" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}
            >
              <PauseIcon className="w-4 h-4 inline" />
              {pauseBadge.label}
            </span>
          </div>
          <p className="text-base text-gray-600 mb-4">
            Score: <strong className="text-black">{pauseDistribution.score}</strong> / 100
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-xl border-2 border-amber-200">
              <p className="text-base text-gray-500 mb-1">Average</p>
              <p className="text-base font-bold text-black">
                {typeof pauseDistribution.avgWordsPerPause === "number"
                  ? `${pauseDistribution.avgWordsPerPause} words per pause`
                  : "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl border-2 border-amber-200">
              <p className="text-base text-gray-500 mb-1">Mandatory pauses</p>
              <p
                className={`text-base font-bold flex items-center gap-1 ${pauseDistribution.mandatoryCovered ? "text-green-600" : "text-red-600"}`}
              >
                {pauseDistribution.mandatoryCovered ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 shrink-0" />
                    Covered
                  </>
                ) : (
                  <>Not covered</>
                )}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl border-2 border-amber-200 mb-3">
            <p className="text-base text-gray-500 mb-1">Comma Pauses</p>
            <p className="text-base font-bold text-red-600">
              Missed {pauseDistribution.commaPausesMissed ?? 0}
            </p>
          </div>
          {pauseDistribution?.feedback && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
              <p className="text-base text-gray-700 leading-tight">{pauseDistribution.feedback}</p>
            </div>
          )}
        </div>

        {/* Filler Words */}
        <div
          className={`card shadow-sm p-5 rounded-2xl ${getStatusCardBorder(fillerWords.status)}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-black text-lg">Filler Words</h3>
            <span
              className={`badge rounded-full text-base font-bold py-2 px-3 gap-1 ${fillerBadge.class === "badge-success" ? "bg-green-100 text-green-700" : fillerBadge.class === "badge-error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}
            >
              <FillerIcon className="w-4 h-4 inline" />
              {fillerBadge.label}
            </span>
          </div>
          <p className="text-base text-gray-700 mb-3">
            <span className="text-2xl font-bold text-black">{fillerWords.count}</span> filler words
            in a <span className="font-semibold">{fillerWords.totalWords ?? 0}</span> word sentence
          </p>
          {fillerWords?.fillersFound?.length ? (
            <div className="p-3 rounded-xl border border-gray-200 bg-white mb-3">
              <p className="text-base text-gray-500 mb-1">Common filler words detected.</p>
              <p className="text-base text-black font-medium">
                {getFillerCounts(fillerWords.fillersFound)
                  .map(({ word, count }) => `"${word}"(${count})`)
                  .join(", ")}
              </p>
            </div>
          ) : null}
          {fillerWords?.suggestion && (
            <div className="p-3 rounded-xl border border-green-200 bg-green-50">
              <p className="text-base text-gray-800 leading-tight">{fillerWords.suggestion}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-auto p-6 pb-10">
        <Link
          href={`/control-your-pace/practice?level=${level}`}
          className="btn btn-neutral btn-block btn-lg rounded-xl"
        >
          <MicrophoneIcon className="w-5 h-5 mr-2" />
          Next Sentence
        </Link>
      </div>
    </div>
  );
};

export default ReportPage;
