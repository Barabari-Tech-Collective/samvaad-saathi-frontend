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
import type { FollowUpQuestion, TextAnswerResponse, TranscribeResponse } from "../types";

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
  const [speechFeedbackDelayed, setSpeechFeedbackDelayed] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(8));
  const [caption, setCaption] = useState("");
  const [typedMode, setTypedMode] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedSaved, setTypedSaved] = useState(false);
  const [typedSaving, setTypedSaving] = useState(false);
  const [typedError, setTypedError] = useState<string | null>(null);
  const analysisRef = useRef<AudioAnalysisContext | null>(null);
  const animationRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const startedAtRef = useRef(0);
  const submittingRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const skipFirstTypedDraftSyncRef = useRef(true);
  const analysisTypesRef = useRef(["domain", "communication", "pace", "pause"]);
  const answerVersionRef = useRef<number | undefined>(undefined);
  const api = createApiClient(APIService.TRANSCRIBE);
  const typedDraftKey = question_attempt_id
    ? `practice-text-answer:${question_attempt_id}`
    : undefined;
  const { mutateAsync: uploadAudio } = api.useMutation<TranscribeResponse, FormData>({
    url: ENDPOINTS.TRANSCRIBE.WHISPER,
    config: { headers: { "Content-Type": "multipart/form-data" } },
  });
  const { mutateAsync: completeAnalysis, isPending: isAnalyzing } = api.useMutation({
    url: ENDPOINTS.ANALYSIS.COMPLETE,
  });
  const { mutateAsync: saveTypedAnswer } = api.useMutation<
    TextAnswerResponse,
    { questionAttemptId: number; text: string; language: string }
  >({
    url: ENDPOINTS.TRANSCRIBE.TEXT_ANSWER,
    method: "post",
  });

  async function analyze(
    analysisTypes = analysisTypesRef.current,
    answerVersion = answerVersionRef.current
  ) {
    if (!question_attempt_id) return;
    analysisTypesRef.current = analysisTypes;
    answerVersionRef.current = answerVersion;
    setAnalysisError(false);
    try {
      await completeAnalysis({
        question_attempt_id,
        analysisTypes,
        ...(answerVersion ? { answerVersion } : {}),
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
    draftKey: question_attempt_id ? `practice-answer:${question_attempt_id}` : undefined,
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
      setTypedSaved(false);
      // Scoring can be retried separately after the answer is durably acknowledged.
      trackAnswerRecorded(Math.round((Date.now() - startedAtRef.current) / 1000));
      if (result.followUpGenerated && result.followUpQuestion)
        onFollowUpQuestion?.(result.followUpQuestion);
      if (result.transcriptionStatus !== "failed") {
        setSpeechFeedbackDelayed(false);
        void analyze(["domain", "communication", "pace", "pause"], result.answerVersion);
      } else {
        setSpeechFeedbackDelayed(true);
      }
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

  const busy = ["requesting", "saving"].includes(answer.phase) || isSubmitting || typedSaving;
  // "unsaved" means captured audio that is not yet durably stored, so it must gate
  // Next and Submit. A pending microphone prompt has captured nothing, and
  // including it here disabled Answer and Next together for the whole permission
  // timeout - the frozen footer students reported.
  const typedDraftUnsaved = typedMode && typedAnswer.trim().length > 0 && !typedSaved;
  const unsaved =
    ["recording", "saving", "failed"].includes(answer.phase) || typedSaving || typedDraftUnsaved;
  const answered = answer.phase === "saved" || typedSaved;

  async function submitTypedAnswer() {
    const text = typedAnswer.trim();
    if (!question_attempt_id || !text || typedSaving) return;
    setTypedSaving(true);
    setTypedError(null);
    try {
      const result = await saveTypedAnswer({
        questionAttemptId: question_attempt_id,
        text,
        language: "en",
      });
      if (!result.saved || result.questionAttemptId !== question_attempt_id)
        throw new Error("TEXT_ANSWER_NOT_SAVED");
      setTypedSaved(true);
      setTypedMode(false);
      setTypedAnswer("");
      setSpeechFeedbackDelayed(false);
      void analyze(["domain"], result.answerVersion);
    } catch {
      setTypedError(
        "Your typed answer has not been saved. Keep this page open and select Save typed answer again."
      );
    } finally {
      setTypedSaving(false);
    }
  }

  async function submit() {
    if (submittingRef.current || unsaved || !onSubmit) return;
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
    if (!timerExpired) return;
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
  }, [timerExpired, answer.phase]);

  useEffect(() => {
    if (!typedDraftKey) return;
    try {
      const draft = window.sessionStorage.getItem(typedDraftKey);
      if (draft) {
        setTypedAnswer(draft);
        setTypedMode(true);
      }
    } catch {
      /* blocked storage still leaves the in-memory textarea usable */
    }
  }, [typedDraftKey]);

  useEffect(() => {
    if (!typedDraftKey) return;
    if (skipFirstTypedDraftSyncRef.current) {
      skipFirstTypedDraftSyncRef.current = false;
      return;
    }
    try {
      if (typedAnswer && !typedSaved) window.sessionStorage.setItem(typedDraftKey, typedAnswer);
      else window.sessionStorage.removeItem(typedDraftKey);
    } catch {
      /* blocked storage still leaves the in-memory textarea usable */
    }
  }, [typedAnswer, typedDraftKey, typedSaved]);

  useEffect(() => {
    if (!typedDraftUnsaved) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [typedDraftUnsaved]);

  function next() {
    if (unsaved || isSubmitting || timerExpired) return;
    // Moving on abandons any microphone prompt still waiting for an answer.
    if (answer.phase === "requesting") answer.cancel();
    if (answered) {
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
      {typedError && (
        <p role="alert" className="text-red-700">
          {typedError}
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
      {speechFeedbackDelayed && (
        <p role="status" className="text-amber-800">
          Your answer is saved. Speech feedback is delayed, but you can continue safely.
        </p>
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
      {typedSaved && <p role="status">Typed answer saved. Speech feedback will be limited.</p>}
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
      ) : typedMode ? (
        <div className="w-full rounded-2xl border border-[#DEE8FB] bg-white p-4">
          <label htmlFor="typed-interview-answer" className="mb-2 block font-semibold">
            Type your answer
          </label>
          <p className="mb-3 text-sm text-slate-600">
            Use this when your microphone is unavailable. We can assess the content, but not your
            pronunciation or speaking pace.
          </p>
          <textarea
            id="typed-interview-answer"
            className="textarea textarea-bordered min-h-36 w-full text-base"
            value={typedAnswer}
            maxLength={5000}
            onChange={(event) => {
              setTypedAnswer(event.target.value);
              setTypedSaved(false);
              setTypedError(null);
            }}
            placeholder="Type what you would say in the interview…"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-600">{typedAnswer.length} of 5000 characters</span>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost"
                disabled={typedSaving}
                onClick={() => {
                  if (!typedAnswer.trim()) setTypedMode(false);
                  else setTypedError("Save your typed answer or clear it before returning.");
                }}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                disabled={!typedAnswer.trim() || typedSaving}
                onClick={() => void submitTypedAnswer()}
              >
                {typedSaving ? "Saving…" : "Save typed answer"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-wrap gap-2">
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
                if (answered && question_attempt_id)
                  trackRedoButtonClick(String(question_attempt_id), 1);
                else trackAnswerStartClick();
                void answer.start();
              }}
            >
              {answered ? "Redo" : "Answer"} <MicrophoneIcon className="h-5 w-5" />
            </button>
            {!isIntroStep && question_attempt_id && !answered && answer.phase !== "failed" && (
              <button className="btn btn-ghost" onClick={() => setTypedMode(true)}>
                Type answer instead
              </button>
            )}
          </div>
          {isLastQuestion || timerExpired ? (
            <button
              className="btn btn-primary"
              disabled={unsaved || isSubmitting}
              onClick={() => setModal("submit")}
            >
              {isSubmitting ? "Submitting…" : "Submit"}
            </button>
          ) : (
            <button
              className="btn btn-outline"
              disabled={unsaved || isSubmitting || (isIntroStep && answer.phase !== "saved")}
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
