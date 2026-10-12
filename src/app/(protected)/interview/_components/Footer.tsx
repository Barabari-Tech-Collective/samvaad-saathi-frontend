"use client";

import { useEffect, useRef, useState } from "react";
import { MicrophoneIcon } from "@heroicons/react/24/solid";
import { useInterviewAnswer } from "@/hooks/useInterviewAnswer";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import {
  cleanupAudioAnalysis,
  createAudioAnalysisContext,
  startWaveformAnimation,
  type AudioAnalysisContext,
} from "@/lib/audio-utils";
import {
  trackAnswerRecorded,
  trackAnswerStartClick,
  trackButtonClick,
  trackRedoButtonClick,
  trackSkipQuestionClick,
  trackSubmitInterviewClick,
} from "@/lib/posthog/tracking.utils";
import type { FollowUpQuestion, TranscribeResponse } from "../types";

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface FooterProps {
  isLoading?: boolean;
  disabled?: boolean;
  question_attempt_id?: number;
  followUpStrategy?: string | null;
  isCurrentQuestionFollowUp?: boolean;
  onNext?: () => void;
  isLastQuestion?: boolean;
  onSubmit?: () => Promise<void>;
  onFollowUpQuestion?: (question: FollowUpQuestion) => void;
  isIntroStep?: boolean;
  timerExpired?: boolean;
}

export default function Footer({
  isLoading = false,
  disabled = false,
  question_attempt_id,
  followUpStrategy,
  isCurrentQuestionFollowUp = false,
  onNext,
  isLastQuestion = false,
  onSubmit,
  onFollowUpQuestion,
  isIntroStep = false,
  timerExpired = false,
}: FooterProps) {
  const [modal, setModal] = useState<"skip" | "submit" | "discard" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(8));
  const [caption, setCaption] = useState("");
  const analysisRef = useRef<AudioAnalysisContext | null>(null);
  const animationRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const startedAtRef = useRef(0);
  const submittingRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const api = createApiClient(APIService.TRANSCRIBE);
  const { mutateAsync: uploadAudio } = api.useMutation<TranscribeResponse, FormData>({
    url: ENDPOINTS.TRANSCRIBE.WHISPER,
    config: { headers: { "Content-Type": "multipart/form-data" } },
  });
  const { mutateAsync: completeAnalysis, isPending: isAnalyzing } = api.useMutation({
    url: ENDPOINTS.ANALYSIS.COMPLETE,
  });

  async function analyze() {
    if (!question_attempt_id) return;
    setAnalysisError(false);
    try {
      await completeAnalysis({
        question_attempt_id,
        analysisTypes: ["domain", "communication", "pace", "pause"],
      });
    } catch {
      setAnalysisError(true);
    }
  }

  function stopVisuals() {
    animationRef.current?.();
    animationRef.current = null;
    cleanupAudioAnalysis(analysisRef.current);
    analysisRef.current = null;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try {
        recognition.stop();
      } catch {
        /* recognition may already have stopped */
      }
    }
    recognitionRef.current = null;
  }

  const answer = useInterviewAnswer({
    save: async (file) => {
      if (isIntroStep) return;
      if (!question_attempt_id) throw new Error("ATTEMPT_NOT_READY");
      const data = new FormData();
      data.append("question_attempt_id", String(question_attempt_id));
      data.append("language", "en");
      data.append("file", file);
      const result = await uploadAudio(data);
      if (result.saved !== true || result.questionAttemptId !== question_attempt_id)
        throw new Error("ANSWER_NOT_SAVED");
      // Scoring can be retried separately after the answer is durably acknowledged.
      trackAnswerRecorded(Math.round((Date.now() - startedAtRef.current) / 1000));
      if (result.followUpGenerated && result.followUpQuestion)
        onFollowUpQuestion?.(result.followUpQuestion);
      void analyze();
    },
    onStream: (stream) => {
      startedAtRef.current = Date.now();
      setCaption("");
      try {
        analysisRef.current = createAudioAnalysisContext(stream);
        let lastUpdate = 0;
        animationRef.current = startWaveformAnimation(analysisRef.current.analyser, (bars) => {
          if (Date.now() - lastUpdate >= 50) {
            lastUpdate = Date.now();
            setWaveformBars(bars);
          }
        });
      } catch {
        /* waveform is optional */
      }
      const browser = window as typeof window & {
        SpeechRecognition?: new () => Recognition;
        webkitSpeechRecognition?: new () => Recognition;
      };
      const RecognitionClass = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
      if (!RecognitionClass) return;
      try {
        const recognition = new RecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";
        recognition.onresult = (event) =>
          setCaption(
            Array.from(event.results, (result) => result[0]?.transcript.trim() ?? "").join(" ")
          );
        recognitionRef.current = recognition;
        recognition.start();
      } catch {
        /* captions are optional */
      }
    },
    onStop: stopVisuals,
  });

  const busy = ["requesting", "saving"].includes(answer.phase) || isSubmitting;
  // "unsaved" means captured audio that is not yet durably stored, so it must gate
  // Next and Submit. A pending microphone prompt has captured nothing, and
  // including it here disabled Answer and Next together for the whole permission
  // timeout - the frozen footer students reported.
  const unsaved = ["recording", "saving", "failed"].includes(answer.phase);

  async function submit() {
    if (submittingRef.current || unsaved || isAnalyzing || !onSubmit) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setModal(null);
    try {
      trackSubmitInterviewClick();
      await onSubmit();
    } catch {
      setSubmitError(
        "The interview could not be submitted. Your saved answers are safe. Select Submit to try again."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const expiryRef = useRef({ stop: answer.stop, submit, cancel: answer.cancel });
  expiryRef.current = { stop: answer.stop, submit, cancel: answer.cancel };
  useEffect(() => {
    if (!timerExpired || isAnalyzing) return;
    if (answer.phase === "recording") {
      void expiryRef.current.stop();
      return;
    }
    // Expiry must not wait out a microphone prompt nobody is going to answer.
    if (answer.phase === "requesting") {
      expiryRef.current.cancel();
      return;
    }
    if (["idle", "saved"].includes(answer.phase) && !autoSubmitAttemptedRef.current) {
      autoSubmitAttemptedRef.current = true;
      void expiryRef.current.submit();
    }
  }, [timerExpired, answer.phase, isAnalyzing]);

  function next() {
    if (unsaved || isAnalyzing || isSubmitting || timerExpired) return;
    // Moving on abandons any microphone prompt still waiting for an answer.
    if (answer.phase === "requesting") answer.cancel();
    if (answer.phase === "saved") {
      trackButtonClick("next_question", "interview_footer");
      onNext?.();
    } else setModal("skip");
  }
  const fillerCount = caption
    .split(/\s+/)
    .filter((word) => /^(um+|uh+|hmm*|er|ah|erm|mhm)[.,!?]*$/i.test(word)).length;

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 py-4"
      aria-busy={busy}
    >
      {timerExpired && (
        <p role="status">
          Time is up. We will save your current answer before submitting. Keep this page open.
        </p>
      )}
      {answer.error && (
        <p role="alert" className="text-red-700">
          {answer.error}
        </p>
      )}
      {submitError && (
        <p role="alert" className="text-red-700">
          {submitError}
        </p>
      )}
      {analysisError && (
        <div role="status" className="text-amber-800">
          Your answer is saved, but feedback processing failed.{" "}
          <button className="btn btn-sm" onClick={() => void analyze()} disabled={isAnalyzing}>
            Retry feedback
          </button>
        </div>
      )}
      {answer.phase === "failed" && (
        <button className="btn btn-primary" onClick={() => void answer.retry()}>
          Retry save
        </button>
      )}
      {answer.phase === "failed" && (
        <button className="btn btn-outline" onClick={() => setModal("discard")}>
          {timerExpired ? "Discard failed answer and submit" : "Discard recording and start again"}
        </button>
      )}
      {isAnalyzing && <p role="status">Answer saved. Preparing feedback…</p>}
      {answer.phase === "saving" && (
        <p role="status">
          {followUpStrategy === "llm_transcription_based" && !isCurrentQuestionFollowUp
            ? "Saving answer and checking for a follow-up…"
            : "Saving your answer…"}
        </p>
      )}
      {answer.phase === "requesting" && (
        <p role="status">
          Allow microphone access in your browser. This will time out if no permission is given.
        </p>
      )}
      {answer.phase === "saved" && (
        <p role="status">{isIntroStep ? "Introduction complete." : "Answer saved."}</p>
      )}
      {isLoading ? (
        <p role="status">Loading question…</p>
      ) : answer.phase === "recording" ? (
        <>
          <div className="w-full max-w-3xl rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-8 text-center">
            <h2 className="text-xl font-semibold">Listening…</h2>
            <p>
              {Math.floor(answer.timeRemaining / 60)}:
              {String(answer.timeRemaining % 60).padStart(2, "0")}
            </p>
            <div className="my-6 flex h-20 items-center justify-center gap-1" aria-hidden="true">
              {waveformBars.map((height, index) => (
                <span
                  key={index}
                  className="w-2 rounded bg-indigo-500"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            {caption && (
              <div className="rounded-lg bg-white p-4 text-left">
                <p>{caption}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Filler words so far: {fillerCount}. Live preview only; your final transcript may
                  differ.
                </p>
              </div>
            )}
          </div>
          <button className="btn btn-primary self-end" onClick={() => void answer.stop()}>
            Done
          </button>
        </>
      ) : (
        <div className="flex w-full items-center justify-between">
          <button
            className="btn btn-primary"
            disabled={
              disabled ||
              busy ||
              answer.phase === "failed" ||
              timerExpired ||
              (!isIntroStep && !question_attempt_id)
            }
            onClick={() => {
              if (answer.phase === "saved" && question_attempt_id)
                trackRedoButtonClick(String(question_attempt_id), 1);
              else trackAnswerStartClick();
              void answer.start();
            }}
          >
            {answer.phase === "saved" ? "Redo" : "Answer"} <MicrophoneIcon className="h-5 w-5" />
          </button>
          {isLastQuestion || timerExpired ? (
            <button
              className="btn btn-primary"
              disabled={unsaved || isAnalyzing || isSubmitting}
              onClick={() => setModal("submit")}
            >
              {isSubmitting ? "Submitting…" : "Submit"}
            </button>
          ) : (
            <button
              className="btn btn-outline"
              disabled={
                unsaved || isAnalyzing || isSubmitting || (isIntroStep && answer.phase !== "saved")
              }
              onClick={next}
            >
              Next
            </button>
          )}
        </div>
      )}
      {modal && (
        <dialog open className="modal modal-open" aria-labelledby="interview-confirm-title">
          <div className="modal-box">
            <h3 id="interview-confirm-title" className="text-lg font-bold">
              {modal === "discard"
                ? "Discard this unsaved recording?"
                : modal === "skip"
                  ? "Skip this question?"
                  : "Submit interview?"}
            </h3>
            <p className="py-4">
              {modal === "discard"
                ? "This recording has not been saved and will be lost. You can cancel and retry saving it instead."
                : modal === "skip"
                  ? "This question will have no recorded answer."
                  : "Your saved answers will be submitted for review."}
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={(unsaved && modal !== "discard") || isSubmitting}
                onClick={() => {
                  if (modal === "discard") {
                    answer.discard();
                    setModal(null);
                  } else if (modal === "submit") void submit();
                  else {
                    trackSkipQuestionClick();
                    setModal(null);
                    onNext?.();
                  }
                }}
              >
                {modal === "discard"
                  ? "Yes, discard recording"
                  : modal === "skip"
                    ? "Yes, Skip"
                    : "Yes, Submit"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
