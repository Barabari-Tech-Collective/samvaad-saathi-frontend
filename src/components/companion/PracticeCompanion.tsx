"use client";
import { useSyncExternalStore } from "react";
import {
  companionActivity,
  type CompanionActivity,
  type CompanionSpeech,
} from "@/lib/interview-companion";
import type { CompanionPreferences, CompanionSnapshot } from "@/hooks/useCompanionPreferences";
import type { AnswerPhase } from "@/hooks/useInterviewAnswer";

export interface PracticeCompanionControls {
  preferences: CompanionSnapshot;
  update: (patch: Partial<CompanionPreferences>) => void;
  speech: CompanionSpeech;
  blocked?: boolean;
}
function subscribeConnection(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}
export default function PracticeCompanion({
  controls,
  answer,
  working,
  saved,
}: {
  controls: PracticeCompanionControls;
  answer: AnswerPhase;
  working: boolean;
  saved: boolean;
}) {
  const connected = useSyncExternalStore(
    subscribeConnection,
    () => navigator.onLine,
    () => true
  );
  const { preferences, update } = controls;
  const activity = companionActivity({
    connected,
    answer,
    working,
    saved,
    speech: controls.speech,
    blocked: controls.blocked,
  } satisfies CompanionActivity);
  if (!preferences.ready) return null;
  return (
    <aside
      aria-label="Saathi practice companion"
      className="w-full rounded-2xl border border-[var(--border-subtle)] bg-white p-4 sm:p-5"
    >
      {!preferences.hidden && (
        <div
          className="flex items-center gap-4"
          data-companion-state={activity.state}
          data-companion-motion={preferences.motion}
        >
          <svg
            className="saathi-face h-16 w-16 shrink-0 sm:h-20 sm:w-20"
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="10" y="20" width="80" height="72" rx="28" fill="#344499" />
            <path d="M36 21V14a14 14 0 0 1 28 0v7" fill="none" stroke="#FFCC33" strokeWidth="8" />
            <rect x="21" y="34" width="58" height="43" rx="20" fill="#F5F9FF" />
            <g className="saathi-eyes" fill="#1F285B">
              <ellipse cx="38" cy="51" rx="5" ry="7" />
              <ellipse cx="62" cy="51" rx="5" ry="7" />
            </g>
            {activity.state === "speaking" ? (
              <rect
                className="saathi-mouth"
                x="43"
                y="61"
                width="14"
                height="9"
                rx="4"
                fill="#344499"
              />
            ) : (
              <path
                d="M43 64q7 6 14 0"
                fill="none"
                stroke="#344499"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
            <circle cx="82" cy="26" r="7" fill="#FFCC33" />
          </svg>
          <div className="min-w-0">
            <p className="font-heading text-lg font-semibold text-[var(--brand-navy)]">
              Saathi{" "}
              <span className="ml-1 rounded-full bg-[#FFE4BF] px-2 py-1 text-xs font-medium">
                AI
              </span>
            </p>
            <p className="text-sm text-slate-600">Your practice companion</p>
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-1 text-sm text-slate-800"
            >
              {activity.text}
            </p>
          </div>
        </div>
      )}
      <div
        className={`flex flex-wrap gap-x-3 gap-y-1 ${preferences.hidden ? "" : "mt-3 border-t border-[var(--border-subtle)] pt-2"}`}
      >
        <button
          type="button"
          className="min-h-11 rounded-lg px-2 text-sm text-[var(--brand-blue)] underline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => update({ hidden: !preferences.hidden })}
        >
          {preferences.hidden ? "Show Saathi" : "Hide Saathi"}
        </button>
        {!preferences.hidden && (
          <button
            type="button"
            aria-pressed={preferences.motion}
            className="min-h-11 rounded-lg px-2 text-sm text-slate-700 underline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => update({ motion: !preferences.motion })}
          >
            {preferences.motion ? "Pause face animation" : "Enable face animation"}
          </button>
        )}
        <button
          type="button"
          aria-pressed={preferences.muted}
          className="min-h-11 rounded-lg px-2 text-sm text-slate-700 underline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => update({ muted: !preferences.muted })}
        >
          {preferences.muted ? "Unmute question audio" : "Mute question audio"}
        </button>
      </div>
    </aside>
  );
}
