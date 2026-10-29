"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import {
  AUDIO_CONSTRAINTS_16KHZ,
  cleanupAudioAnalysis,
  createAudioAnalysisContext,
  resampleAudioTo16kHz,
  startWaveformAnimation,
  type AudioAnalysisContext,
} from "@/lib/audio-utils";
import { MicrophoneIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface AnswerTypeStepProps {
  questionText: string;
  framework: string;
  currentSection: string;
  currentStep: number;
  totalSteps: number;
  practiceId: string;
  questionIndex: number;
  current_hint: string;
  onComplete: () => void;
  onAnalyze?: () => void;
  onRedoPrevious?: () => void;
  onSkipQuestion?: () => void;
  hasPreviousSection?: boolean;
  previousSection?: string;
}

const AnswerTypeStep = ({
  questionText,
  framework,
  currentSection,
  currentStep,
  totalSteps,
  practiceId,
  questionIndex,
  current_hint,
  onComplete,
  onAnalyze,
  onRedoPrevious,
  onSkipQuestion,
  hasPreviousSection = false,
  previousSection,
}: AnswerTypeStepProps) => {
  const captureBusy = useRef(false);
  const generation = useRef(0);
  const [capturePending, setCapturePending] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const sectionLabel = currentSection;
  const [isListening, setIsListening] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // elapsed time in seconds
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0));
  const [nextHint, setNextHint] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioAnalysisRef = useRef<AudioAnalysisContext | null>(null);
  const stopWaveformAnimationRef = useRef<(() => void) | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const skipNextHintResetRef = useRef(false);

  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount - stops the mic stream too, not just the waveform/
  // analysis context, so navigating away mid-recording actually releases
  // the microphone instead of leaving it live until GC/tab close.
  useEffect(() => {
    generation.current += 1;
    captureBusy.current = false;
    setCapturePending(false);
    setCaptureError("");
    return () => {
      generation.current += 1;
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onerror = null;
      }
      if (stopWaveformAnimationRef.current) {
        stopWaveformAnimationRef.current();
      }
      cleanupAudioAnalysis(audioAnalysisRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    };
  }, [practiceId, questionIndex, currentSection]);

  // Reset timer when section changes (preserve nextHint if we just set it from API)
  useEffect(() => {
    if (skipNextHintResetRef.current) {
      skipNextHintResetRef.current = false;
    } else {
      setNextHint(null);
    }
    setTimeElapsed(0);
    setHasAnswered(false);
    setIsListening(false);
    recordingStartTimeRef.current = null;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [currentSection]);

  // Timer elapsed time effect
  useEffect(() => {
    if (isListening) {
      if (!recordingStartTimeRef.current) {
        recordingStartTimeRef.current = Date.now();
      }
      timerIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setTimeElapsed(elapsed);
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isListening]);

  const { mutateAsync: submitAudio, isPending: isUploading } = apiClient.useMutation({
    url: ENDPOINTS_V2.SUBMIT_STRUCTURED_PRACTICE_AUDIO(practiceId, questionIndex, currentSection),
    method: "post",
    config: {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  });

  const startRecording = async () => {
    if (captureBusy.current) return;
    captureBusy.current = true;
    setCapturePending(true);
    setCaptureError("");
    const revision = generation.current;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS_16KHZ,
      });

      if (revision !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setTimeElapsed(0);
      recordingStartTimeRef.current = Date.now();

      // Waveform visualisation is optional; unavailable AudioContext must not leak the mic.
      let audioAnalysis: AudioAnalysisContext | null = null;
      try {
        audioAnalysis = createAudioAnalysisContext(stream);
      } catch {
        /* Keep recording usable. */
      }
      audioAnalysisRef.current = audioAnalysis;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = () => {
        if (revision !== generation.current) return;
        mediaRecorder.onstop = null;
        mediaRecorder.ondataavailable = null;
        if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
        stream?.getTracks().forEach((track) => track.stop());
        stopWaveformAnimationRef.current?.();
        cleanupAudioAnalysis(audioAnalysisRef.current);
        captureBusy.current = false;
        setCapturePending(false);
        setIsListening(false);
        setCaptureError("Recording stopped unexpectedly. Check your microphone and record again.");
      };
      mediaRecorder.start();
      setIsListening(true);
      setCapturePending(false);

      const throttledUpdate = (bars: number[]) => {
        const now = Date.now();
        if (now - lastUpdateTimeRef.current >= 50) {
          lastUpdateTimeRef.current = now;
          setWaveformBars(bars);
        }
      };

      lastUpdateTimeRef.current = Date.now();
      if (audioAnalysis)
        stopWaveformAnimationRef.current = startWaveformAnimation(
          audioAnalysis.analyser,
          throttledUpdate
        );
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      cleanupAudioAnalysis(audioAnalysisRef.current);
      if (revision === generation.current) {
        captureBusy.current = false;
        setCapturePending(false);
        setCaptureError("Could not record. Allow microphone access and try again.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsListening(false);
      recordingStartTimeRef.current = null;

      if (stopWaveformAnimationRef.current) {
        stopWaveformAnimationRef.current();
        stopWaveformAnimationRef.current = null;
      }

      cleanupAudioAnalysis(audioAnalysisRef.current);
      audioAnalysisRef.current = null;
      setWaveformBars(Array(20).fill(0));

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleRecordClick = () => {
    startRecording();
  };

  const handleStopListening = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return;
    const revision = generation.current;
    const recorder = mediaRecorderRef.current;
    setCapturePending(true);

    // Capture the time elapsed and section before stopping
    const capturedTimeElapsed = timeElapsed;

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        if (revision !== generation.current) return;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chunksRef.current[0]?.type || "audio/webm",
        });

        try {
          if (!blob.size) throw new Error("empty-recording");
          const wavBlob = await resampleAudioTo16kHz(blob);
          if (revision !== generation.current) return;
          const file = new File([wavBlob], "recording.wav", {
            type: "audio/wav",
          });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("time_spent_seconds", capturedTimeElapsed.toString());

          const data = (await submitAudio(formData)) as { nextSectionHint?: string };
          if (revision !== generation.current) return;
          if (data?.nextSectionHint) {
            skipNextHintResetRef.current = true;
            setNextHint(data.nextSectionHint);
          }
          toast.success("Answer recorded");
          setHasAnswered(true);
          onComplete();
        } catch (error) {
          if (revision !== generation.current) return;
          // The backend already returns a specific reason (e.g. "answer too
          // short to evaluate") - show that instead of a generic message so
          // the student knows what to actually do differently.
          let errorMessage = "Failed to submit. Please try again.";
          if (axios.isAxiosError(error) && typeof error.response?.data?.detail === "string") {
            errorMessage = error.response.data.detail;
          }
          toast.error(errorMessage);
          setCaptureError(errorMessage);
        } finally {
          if (revision === generation.current) {
            captureBusy.current = false;
            setCapturePending(false);
          }
        }
      };
      stopRecording();
    }
  };

  const showAnalyzeActions = currentStep === totalSteps && hasAnswered && Boolean(onAnalyze);

  return (
    <div className="studio-panel studio-drill-room flex flex-col">
      {/* Section Header */}
      <div className="mb-6">
        <p className="studio-eyebrow mb-3">
          Answer structure · {currentStep} of {totalSteps}
        </p>
        <h1 className="mb-3">{sectionLabel}</h1>
        <p className="text-sm text-gray-600 mb-2">Framework: {framework}</p>
        {(nextHint || current_hint) && (
          <p className="text-sm text-gray-700 italic bg-blue-50 p-3 rounded">
            {nextHint || current_hint}
          </p>
        )}
      </div>

      {/* Question Text */}
      <div className="mb-8">
        <p className="text-lg leading-relaxed text-gray-900">{questionText}</p>
      </div>

      {captureError && (
        <p role="alert" className="text-red-700 mb-4">
          {captureError}
        </p>
      )}
      {capturePending && (
        <p role="status" className="mb-4">
          {isUploading ? "Saving your answer…" : "Preparing audio…"}
        </p>
      )}
      {/* Recording UI */}
      {isListening ? (
        <>
          {/* Recording state uses the same surface as the interview room. */}
          <div className="studio-recording mb-6">
            {/* Content */}
            <div className="relative flex flex-col items-center gap-6 sm:gap-8">
              {/* Listening text */}
              <h2 className="text-lg sm:text-xl font-medium text-gray-800 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Listening...
              </h2>

              {/* Timer - Elapsed Time */}
              <div className="text-xl sm:text-4xl font-semibold text-indigo-700 tabular-nums">
                {formatTime(timeElapsed)}
              </div>

              <MicrophoneIcon className="size-10 text-[var(--studio-blue)]" aria-hidden="true" />

              {/* Waveform bars */}
              <div
                aria-hidden="true"
                className="flex h-16 sm:h-20 items-center justify-center gap-1 sm:gap-1.5"
              >
                {waveformBars.map((height, index) => (
                  <div
                    key={index}
                    className="w-1 sm:w-1.5 rounded-full bg-indigo-600 transition-all duration-150 ease-out"
                    style={{
                      height: isListening ? `${Math.max(height, 8)}%` : "8%",
                      opacity: isListening ? 0.6 + height / 200 : 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 items-center w-full mt-auto pt-6 flex-wrap">
            <button
              onClick={handleStopListening}
              disabled={isUploading || capturePending}
              className="btn btn-neutral"
            >
              {isUploading ? "Submitting..." : "Done"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex justify-between gap-1 mt-auto pt-6 flex-wrap">
          {!hasAnswered && hasPreviousSection && previousSection && (
            <button
              disabled={isUploading || capturePending}
              onClick={onRedoPrevious}
              className="btn btn-outline"
            >
              Redo {previousSection}
            </button>
          )}

          {showAnalyzeActions && (
            <button onClick={() => setHasAnswered(false)} className="btn btn-outline">
              Redo {sectionLabel}
            </button>
          )}

          {showAnalyzeActions && (
            <button
              onClick={onAnalyze}
              disabled={isUploading || capturePending}
              className="btn btn-primary text-white"
            >
              {isUploading ? "Uploading Answer..." : "Analyse Answer"}
            </button>
          )}

          {!showAnalyzeActions && (
            <button
              onClick={handleRecordClick}
              disabled={isUploading || capturePending}
              className="btn btn-neutral inline-flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin size-5 border-2 border-current border-t-transparent rounded-full shrink-0" />
                  Submitting...
                </>
              ) : (
                <>
                  Answer {sectionLabel}
                  <MicrophoneIcon className="h-5 w-5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AnswerTypeStep;
