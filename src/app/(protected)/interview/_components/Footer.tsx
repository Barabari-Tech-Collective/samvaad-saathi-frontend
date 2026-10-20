"use client";

import { useEffect, useRef, useState } from "react";
import { MicrophoneIcon } from "@heroicons/react/24/solid";
import { useViewLifetime } from "@/hooks/useViewLifetime";
import { useInterviewAnswer } from "@/hooks/useInterviewAnswer";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { getSessionLeaseErrorCode } from "@/lib/interview-session-lease";
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
import type {
  AdvanceInterviewAction,
  FollowUpQuestion,
  TranscribeResponse,
  TranscriptionStatusResponse,
} from "../types";

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

import PracticeCompanion, {
  type PracticeCompanionControls,
} from "@/components/companion/PracticeCompanion";

interface FooterProps {
  companion?: PracticeCompanionControls;
  allowRerecord?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  question_attempt_id?: number;
  followUpStrategy?: string | null;
  isCurrentQuestionFollowUp?: boolean;
  onNext?: (action: AdvanceInterviewAction, answerVersion?: number) => Promise<void> | void;
  isLastQuestion?: boolean;
  onSubmit?: (action: AdvanceInterviewAction, answerVersion?: number) => Promise<void>;
  onFollowUpQuestion?: (question: FollowUpQuestion) => void;
  isIntroStep?: boolean;
  timerExpired?: boolean;
  initiallyAnswered?: boolean;
  initialAnswerVersion?: number;
  initialTranscriptionStatus?: TranscriptionStatusResponse["status"] | null;
  onSaveAndExit?: () => Promise<void>;
  sessionLeaseToken?: string | null;
  onSessionConflict?: () => void;
}

export default function Footer({
  companion,
  allowRerecord = true,
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
  initiallyAnswered = false,
  initialAnswerVersion = 0,
  initialTranscriptionStatus = null,
  onSaveAndExit,
  sessionLeaseToken,
  onSessionConflict,
}: FooterProps) {
  const lifetime = useViewLifetime();
  const [modal, setModal] = useState<"skip" | "submit" | "discard" | "continue" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState(false);
  const [speechFeedbackDelayed, setSpeechFeedbackDelayed] = useState(
    initialTranscriptionStatus === "failed"
  );
  const [speechFeedbackRetryable, setSpeechFeedbackRetryable] = useState(true);
  const [speechFeedbackMessage, setSpeechFeedbackMessage] = useState<string | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(8));
  const [caption, setCaption] = useState("");
  const [serverAnswered, setServerAnswered] = useState(initiallyAnswered);
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    TranscriptionStatusResponse["status"] | null
  >(initialTranscriptionStatus);
  const [isPausing, setIsPausing] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const analysisRef = useRef<AudioAnalysisContext | null>(null);
  const animationRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const startedAtRef = useRef(0);
  const submittingRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const analysisTypesRef = useRef(["domain", "communication", "pace", "pause"]);
  const answerVersionRef = useRef<number | undefined>(
    initialAnswerVersion > 0 ? initialAnswerVersion : undefined
  );
  const terminalTranscriptionHandledRef = useRef(false);
  const api = createApiClient(APIService.TRANSCRIBE);
  const { mutateAsync: uploadAudio } = api.useMutation<TranscribeResponse, FormData>({
    url: ENDPOINTS.TRANSCRIBE.WHISPER,
    config: { ...lifetime.requestConfig, headers: { "Content-Type": "multipart/form-data" } },
    showToastError: false,
  });
  const { mutateAsync: completeAnalysis, isPending: isAnalyzing } = api.useMutation({
    url: ENDPOINTS.ANALYSIS.COMPLETE,
    config: lifetime.requestConfig,
    showToastError: false,
  });
  const shouldPollTranscription =
    Boolean(question_attempt_id) &&
    (transcriptionStatus === "pending" || transcriptionStatus === "processing");
  const shouldFetchTranscription =
    shouldPollTranscription || (Boolean(question_attempt_id) && transcriptionStatus === "failed");
  const { data: transcriptionProgress } = api.useQuery<TranscriptionStatusResponse>({
    key: ["answer-transcription", question_attempt_id],
    url: ENDPOINTS.TRANSCRIBE.STATUS(question_attempt_id ?? 0),
    enabled: shouldFetchTranscription,
    options: {
      staleTime: 0,
      refetchInterval: shouldPollTranscription ? 1500 : false,
      retry: 3,
    },
  });
  const { mutateAsync: retrySpeechFeedback, isPending: isRetryingSpeechFeedback } = api.useMutation<
    TranscriptionStatusResponse,
    undefined
  >({
    url: ENDPOINTS.TRANSCRIBE.RETRY(question_attempt_id ?? 0),
    method: "post",
    config: lifetime.requestConfig,
    showToastError: false,
  });

  async function analyze(
    analysisTypes = analysisTypesRef.current,
    answerVersion = answerVersionRef.current
  ) {
    if (!question_attempt_id || !lifetime.isCurrent()) return;
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
      if (!lifetime.isCurrent()) return;
      setAnalysisError(true);
    }
  }

  const analyzeLatestRef = useRef(analyze);
  analyzeLatestRef.current = analyze;

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
      lifetime.requireCurrent();
      if (isIntroStep) return;
      if (!question_attempt_id) throw new Error("ATTEMPT_NOT_READY");
      const data = new FormData();
      data.append("question_attempt_id", String(question_attempt_id));
      data.append("language", "en");
      data.append("file", file);
      if (sessionLeaseToken) data.append("session_lease_token", sessionLeaseToken);
      let result: TranscribeResponse;
      try {
        result = await uploadAudio(data);
      } catch (error) {
        if (getSessionLeaseErrorCode(error)) onSessionConflict?.();
        throw error;
      }
      lifetime.requireCurrent();
      if (result.saved !== true || result.questionAttemptId !== question_attempt_id)
        throw new Error("ANSWER_NOT_SAVED");
      setServerAnswered(true);
      // Scoring can be retried separately after the answer is durably acknowledged.
      trackAnswerRecorded(Math.round((Date.now() - startedAtRef.current) / 1000));
      const status = result.transcriptionStatus ?? "transcribed";
      answerVersionRef.current = result.answerVersion;
      setTranscriptionStatus(status);
      terminalTranscriptionHandledRef.current = status === "transcribed";
      if (status === "transcribed") {
        if (result.followUpGenerated && result.followUpQuestion)
          onFollowUpQuestion?.(result.followUpQuestion);
        setSpeechFeedbackDelayed(false);
        setSpeechFeedbackMessage(null);
        void analyze(["domain", "communication", "pace", "pause"], result.answerVersion);
      } else if (status === "failed") {
        setSpeechFeedbackDelayed(true);
      } else {
        setSpeechFeedbackDelayed(false);
        setSpeechFeedbackMessage(null);
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

  useEffect(() => {
    if (!transcriptionProgress || transcriptionProgress.questionAttemptId !== question_attempt_id)
      return;
    setTranscriptionStatus(transcriptionProgress.status);
    if (transcriptionProgress.status === "failed") {
      setSpeechFeedbackDelayed(true);
      setSpeechFeedbackRetryable(transcriptionProgress.retryable !== false);
      setSpeechFeedbackMessage(transcriptionProgress.error ?? null);
      return;
    }
    if (!transcriptionProgress.isTerminal) {
      setSpeechFeedbackDelayed(false);
      setSpeechFeedbackMessage(null);
      return;
    }
    if (transcriptionProgress.status !== "transcribed" || terminalTranscriptionHandledRef.current)
      return;
    terminalTranscriptionHandledRef.current = true;
    setSpeechFeedbackDelayed(false);
    if (transcriptionProgress.followUpQuestion)
      onFollowUpQuestion?.(transcriptionProgress.followUpQuestion);
    void analyzeLatestRef.current(
      ["domain", "communication", "pace", "pause"],
      transcriptionProgress.answerVersion
    );
  }, [transcriptionProgress, question_attempt_id, onFollowUpQuestion]);

  async function retryDelayedSpeechFeedback() {
    if (!question_attempt_id || isRetryingSpeechFeedback) return;
    try {
      lifetime.requireCurrent();
      const result = await retrySpeechFeedback(undefined);
      lifetime.requireCurrent();
      terminalTranscriptionHandledRef.current = false;
      setTranscriptionStatus(result.status);
      setSpeechFeedbackDelayed(result.status === "failed");
      setSpeechFeedbackRetryable(result.retryable !== false);
      setSpeechFeedbackMessage(result.error ?? null);
    } catch {
      setSpeechFeedbackDelayed(true);
    }
  }

  const busy = ["requesting", "saving"].includes(answer.phase) || isSubmitting;
  // "unsaved" means captured audio that is not yet durably stored, so it must gate
  // Next and Submit. A pending microphone prompt has captured nothing, and
  // including it here disabled Answer and Next together for the whole permission
  // timeout - the frozen footer students reported.
  const unsaved = ["recording", "saving", "failed"].includes(answer.phase);
  const answered = answer.phase === "saved" || serverAnswered;

  async function submit(action: AdvanceInterviewAction = answered ? "answer_saved" : "skip") {
    if (submittingRef.current || unsaved || !onSubmit) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setModal(null);
    try {
      trackSubmitInterviewClick();
      await onSubmit(action, answerVersionRef.current);
    } catch {
      setSubmitError(
        "The interview could not be submitted. Your saved answers are safe. Select Submit to try again."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function saveAndExit() {
    if (!onSaveAndExit || unsaved || isSubmitting || isPausing) return;
    if (answer.phase === "requesting") answer.cancel();
    setIsPausing(true);
    setPauseError(null);
    try {
      await onSaveAndExit();
    } catch {
      setPauseError(
        "We could not pause this interview. Your saved answers are safe. Check your connection and try again."
      );
    } finally {
      setIsPausing(false);
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

  async function advance(action: AdvanceInterviewAction) {
    if (!onNext || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setModal(null);
    try {
      await onNext(action, answerVersionRef.current);
    } catch {
      setSubmitError(
        "We could not move to the next question. Your saved answer is safe. Select Next to try again."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function next() {
    if (unsaved || isSubmitting || timerExpired) return;
    // Moving on abandons any microphone prompt still waiting for an answer.
    if (answer.phase === "requesting") answer.cancel();
    if (answered) {
      if (
        followUpStrategy === "llm_transcription_based" &&
        !isCurrentQuestionFollowUp &&
        (transcriptionStatus === "pending" || transcriptionStatus === "processing")
      ) {
        setModal("continue");
        return;
      }
      trackButtonClick("next_question", "interview_footer");
      void advance("answer_saved");
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
      {companion && (
        <PracticeCompanion
          controls={{
            ...companion,
            blocked: companion.blocked || timerExpired || isSubmitting || isPausing || isLoading,
          }}
          answer={answer.phase}
          working={isAnalyzing}
          saved={serverAnswered}
        />
      )}
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
      {pauseError && (
        <p role="alert" className="text-red-700">
          {pauseError}
        </p>
      )}
      {onSaveAndExit && unsaved && (
        <p role="status" className="text-amber-800">
          Save this answer or discard the unsaved draft before leaving.
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
        <div role="status" className="text-amber-800">
          {speechFeedbackMessage ??
            "Your answer is saved. Speech feedback is delayed, but you can continue safely."}{" "}
          {speechFeedbackRetryable ? (
            <button
              className="btn btn-sm"
              onClick={() => void retryDelayedSpeechFeedback()}
              disabled={isRetryingSpeechFeedback}
            >
              {isRetryingSpeechFeedback ? "Retrying…" : "Retry speech feedback"}
            </button>
          ) : (
            <span className="font-semibold">Select Redo to record a clearer answer.</span>
          )}
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
      {(transcriptionStatus === "pending" || transcriptionStatus === "processing") && (
        <p role="status">Answer saved. Preparing speech feedback…</p>
      )}
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
      {(answer.phase === "saved" || (serverAnswered && answer.phase === "idle")) &&
        transcriptionStatus !== "pending" &&
        transcriptionStatus !== "processing" && (
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
          <div className="flex flex-wrap gap-2">
            {(!answered || allowRerecord) && (
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
                  setSpeechFeedbackDelayed(false);
                  setSpeechFeedbackMessage(null);
                  setSpeechFeedbackRetryable(true);
                  void answer.start();
                }}
              >
                {answered ? "Redo" : "Answer"} <MicrophoneIcon className="h-5 w-5" />
              </button>
            )}
            {onSaveAndExit && (
              <button
                className="btn btn-ghost"
                disabled={unsaved || isSubmitting || isPausing || timerExpired}
                onClick={() => void saveAndExit()}
              >
                {isPausing ? "Saving…" : "Save and exit"}
              </button>
            )}
          </div>
          {isLastQuestion || timerExpired ? (
            <button
              className="btn btn-primary"
              disabled={unsaved || isSubmitting}
              onClick={() => {
                if (
                  answered &&
                  followUpStrategy === "llm_transcription_based" &&
                  !isCurrentQuestionFollowUp &&
                  (transcriptionStatus === "pending" || transcriptionStatus === "processing")
                ) {
                  setModal("continue");
                } else {
                  setModal("submit");
                }
              }}
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
                  : modal === "continue"
                    ? "Continue before the follow-up is ready?"
                    : "Submit interview?"}
            </h3>
            <p className="py-4">
              {modal === "discard"
                ? "This recording has not been saved and will be lost. You can cancel and retry saving it instead."
                : modal === "skip"
                  ? "This question will have no recorded answer."
                  : modal === "continue"
                    ? "Your answer is saved. Speech feedback and an adaptive follow-up are still being prepared. You can wait, or continue without answering that follow-up now."
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
                  else if (modal === "continue") {
                    trackButtonClick("continue_without_follow_up", "interview_footer");
                    if (isLastQuestion) void submit("continue_without_follow_up");
                    else void advance("continue_without_follow_up");
                  } else {
                    trackSkipQuestionClick();
                    void advance("skip");
                  }
                }}
              >
                {modal === "discard"
                  ? "Yes, discard recording"
                  : modal === "skip"
                    ? "Yes, Skip"
                    : modal === "continue"
                      ? "Continue without follow-up"
                      : "Yes, Submit"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
