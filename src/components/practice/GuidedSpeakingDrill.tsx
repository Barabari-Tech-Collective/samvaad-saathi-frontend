"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  MicrophoneIcon,
  PauseCircleIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createApiClient, ENDPOINTS } from "@/lib/api-config";
import { APIService } from "@/lib/api-config/src/config";
import { trackEvent } from "@/lib/posthog/tracking.utils";

export interface SpeakingDrillLevel {
  key: "beginner" | "intermediate" | "advanced";
  label: string;
  example: string;
  durationSeconds: number;
  thinkSeconds: number;
  prompts: string[];
  checklist: string[];
}

interface GuidedSpeakingDrillProps {
  module: "warm_up" | "think_fast";
  storageKey: string;
  eyebrow: string;
  title: string;
  description: string;
  levels: SpeakingDrillLevel[];
}

interface DrillCompletionPayload {
  module: "warm_up" | "think_fast";
  level: SpeakingDrillLevel["key"];
  clientCompletionId: string;
  evidenceKind: "audio";
  evidenceUnits: number;
}

interface DrillCompletionResponse {
  completionId: number;
  created: boolean;
  completedAt: string;
}

const PENDING_COMPLETIONS_KEY = "samvaad:pending-practice-completions";

function newCompletionId(module: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${module}:${id}`;
}

function readPendingCompletions(): DrillCompletionPayload[] {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_COMPLETIONS_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function savePendingCompletions(values: DrillCompletionPayload[]): void {
  try {
    localStorage.setItem(PENDING_COMPLETIONS_KEY, JSON.stringify(values.slice(-50)));
  } catch {
    // The drill remains usable when private browsing blocks local storage.
  }
}

type DrillState = "ready" | "preparing" | "answering" | "review" | "complete";

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export default function GuidedSpeakingDrill({
  module,
  storageKey,
  eyebrow,
  title,
  description,
  levels,
}: GuidedSpeakingDrillProps) {
  const apiClient = createApiClient(APIService.INTERVIEWS);
  const [levelKey, setLevelKey] = useState<SpeakingDrillLevel["key"]>("beginner");
  const [promptIndex, setPromptIndex] = useState(0);
  const [state, setState] = useState<DrillState>("ready");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const completionIdRef = useRef(newCompletionId(module));

  const { mutateAsync: recordCompletion, isPending: isSavingCompletion } = apiClient.useMutation<
    DrillCompletionResponse,
    DrillCompletionPayload
  >({
    url: ENDPOINTS.PRACTICE.COMPLETE_DRILL,
    method: "post",
    showToastError: false,
  });

  const level = levels.find((item) => item.key === levelKey) ?? levels[0];
  const prompt = level.prompts[promptIndex % level.prompts.length];
  const hasEvidence = Boolean(audioUrl);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    stopStream();
  }, [stopStream]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, stopRecording]);

  useEffect(() => {
    const flushPending = async () => {
      if (!navigator.onLine) return;
      const pending = readPendingCompletions();
      if (pending.length === 0) return;
      const remaining: DrillCompletionPayload[] = [];
      for (const item of pending) {
        try {
          await recordCompletion(item);
        } catch {
          remaining.push(item);
        }
      }
      savePendingCompletions(remaining);
    };
    void flushPending();
    window.addEventListener("online", flushPending);
    return () => window.removeEventListener("online", flushPending);
  }, [recordCompletion]);

  useEffect(() => {
    if (state !== "preparing" && state !== "answering") return;
    if (secondsLeft <= 0) {
      if (state === "preparing") {
        const recorder = recorderRef.current;
        if (recorder && recorder.state === "inactive") recorder.start(500);
        setState("answering");
        setSecondsLeft(level.durationSeconds);
      } else {
        stopRecording();
        setState("review");
      }
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [level.durationSeconds, secondsLeft, state, stopRecording]);

  const resetEvidence = useCallback(() => {
    stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setMicError(null);
    setCheckedItems([]);
    setState("ready");
    completionIdRef.current = newCompletionId(module);
  }, [audioUrl, module, stopRecording]);

  const chooseAnotherPrompt = () => {
    setPromptIndex((current) => (current + 1) % level.prompts.length);
    resetEvidence();
  };

  const begin = async () => {
    setMicError(null);
    trackEvent("practice_drill_started", {
      module,
      level: level.key,
      answer_mode: "voice",
    });
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError(
        "Voice recording is not available in this browser. Open this page in the latest Chrome or Edge on a device with a microphone."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size > 0) setAudioUrl(URL.createObjectURL(blob));
        stopStream();
      };
      if (level.thinkSeconds === 0) recorder.start(500);
    } catch {
      setMicError(
        "We could not use your microphone. Allow microphone access in browser settings, then try again."
      );
      return;
    }
    setSecondsLeft(level.thinkSeconds || level.durationSeconds);
    setState(level.thinkSeconds > 0 ? "preparing" : "answering");
  };

  const finishAnswer = () => {
    stopRecording();
    setState("review");
  };

  const complete = async () => {
    if (!hasEvidence) return;
    const completion: DrillCompletionPayload = {
      module,
      level: level.key,
      clientCompletionId: completionIdRef.current,
      evidenceKind: "audio",
      evidenceUnits: Math.max(
        1,
        chunksRef.current.reduce((total, chunk) => total + chunk.size, 0)
      ),
    };
    try {
      await recordCompletion(completion);
    } catch {
      const pending = readPendingCompletions();
      if (!pending.some((item) => item.clientCompletionId === completion.clientCompletionId)) {
        savePendingCompletions([...pending, completion]);
      }
    }
    trackEvent("practice_drill_completed", {
      module,
      level: level.key,
      answer_mode: "voice",
      self_review_items: checkedItems.length,
    });
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          completedAt: new Date().toISOString(),
          level: level.key,
          mode: "voice",
          selfReviewCount: checkedItems.length,
        })
      );
    } catch {
      // Completion still works when storage is unavailable; no student is blocked.
    }
    setState("complete");
  };

  const timerLabel = useMemo(() => {
    if (state === "preparing") return "Think time";
    if (state === "answering") return "Recording";
    return "";
  }, [state]);

  if (state === "complete") {
    return (
      <div className="mx-auto max-w-3xl py-4 text-[#111827]">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-center sm:p-10">
          <CheckCircleIcon className="mx-auto size-14 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold">Practice complete</h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-700">
            You completed one practice answer. Listen to yourself and use your checklist—this short
            drill does not give an AI score.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={resetEvidence}
              className="min-h-12 rounded-xl bg-[#FFCC33] px-6 font-bold text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
            >
              Practise again
            </button>
            <Link
              href="/practice"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#1F285B] px-6 font-bold text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
            >
              Back to Practice
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-8 text-[#111827]">
      <header className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#344499]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">{description}</p>
      </header>

      <section className="rounded-3xl border border-[#D6E0FB] bg-white p-5 sm:p-7">
        <fieldset disabled={state !== "ready"}>
          <legend className="text-lg font-bold">Choose your level</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {levels.map((item) => (
              <label
                key={item.key}
                className={`min-h-28 cursor-pointer rounded-2xl border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#344499] ${
                  levelKey === item.key
                    ? "border-[#344499] bg-[#F5F7FF] ring-2 ring-[#344499]/15"
                    : "border-gray-200 hover:border-[#344499]"
                }`}
              >
                <input
                  type="radio"
                  name="drill-level"
                  value={item.key}
                  checked={levelKey === item.key}
                  onChange={() => {
                    setLevelKey(item.key);
                    setPromptIndex(0);
                  }}
                  className="sr-only"
                />
                <span className="font-bold">{item.label}</span>
                <span className="mt-2 block text-sm leading-5 text-gray-600">{item.example}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7 rounded-2xl bg-[#F5F7FF] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#344499]">
                Your prompt
              </p>
              <h2 className="mt-3 text-xl font-bold leading-8">{prompt}</h2>
            </div>
            <button
              type="button"
              onClick={chooseAnotherPrompt}
              disabled={state !== "ready"}
              aria-label="Choose another prompt"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#D6E0FB] bg-white px-3 text-sm font-semibold text-[#344499] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowPathIcon className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">Another prompt</span>
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            {level.thinkSeconds > 0 ? `${level.thinkSeconds} seconds to think · ` : ""}
            {level.durationSeconds} seconds to answer
          </p>
        </div>

        {state === "ready" && (
          <div className="mt-7">
            <p className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 px-4 font-semibold">
              <MicrophoneIcon className="size-5" aria-hidden="true" /> Record my answer
            </p>
            {micError && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
                <p className="text-sm text-amber-950">{micError}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void begin()}
              className="mt-5 min-h-12 w-full rounded-xl bg-[#FFCC33] px-6 font-bold text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
            >
              Start practice
            </button>
          </div>
        )}

        {(state === "preparing" || state === "answering") && (
          <div
            className="mt-7 rounded-2xl border border-[#344499] p-6 text-center"
            aria-live="polite"
          >
            <p className="font-semibold text-[#344499]">{timerLabel}</p>
            <p className="mt-2 text-5xl font-bold tabular-nums">{formatTime(secondsLeft)}</p>
            {state === "answering" && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-red-700">
                <span className="size-2 animate-pulse rounded-full bg-red-600" /> Recording now
              </p>
            )}
            {state === "answering" && (
              <button
                type="button"
                onClick={finishAnswer}
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1F285B] px-6 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
              >
                <PauseCircleIcon className="size-6" aria-hidden="true" />
                Finish answer
              </button>
            )}
          </div>
        )}

        {state === "review" && (
          <div className="mt-7">
            <h2 className="text-xl font-bold">Review one thing before you finish</h2>
            {audioUrl ? (
              <div className="mt-4 rounded-xl border border-gray-200 p-4">
                <p className="mb-3 flex items-center gap-2 font-semibold">
                  <SpeakerWaveIcon className="size-5" aria-hidden="true" /> Listen to your answer
                </p>
                <audio controls src={audioUrl} className="w-full" />
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-amber-50 p-4 text-amber-950" role="status">
                No audio was captured. Check microphone access and try recording again.
              </p>
            )}
            <fieldset className="mt-5">
              <legend className="font-bold">What did you notice?</legend>
              <div className="mt-3 space-y-2">
                {level.checklist.map((item) => (
                  <label
                    key={item}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#344499]"
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems.includes(item)}
                      onChange={(event) =>
                        setCheckedItems((current) =>
                          event.target.checked
                            ? [...current, item]
                            : current.filter((value) => value !== item)
                        )
                      }
                      className="checkbox checkbox-sm"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void complete()}
                disabled={!hasEvidence || isSavingCompletion}
                className="min-h-12 rounded-xl bg-[#FFCC33] px-6 font-bold text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                {isSavingCompletion ? "Saving practice…" : "Complete this practice"}
              </button>
              <button
                type="button"
                onClick={resetEvidence}
                className="min-h-12 rounded-xl border border-[#1F285B] px-6 font-bold text-[#1F285B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
