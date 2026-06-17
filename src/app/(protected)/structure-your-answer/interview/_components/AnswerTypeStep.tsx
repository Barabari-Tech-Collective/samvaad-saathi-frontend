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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopWaveformAnimationRef.current) {
        stopWaveformAnimationRef.current();
      }
      cleanupAudioAnalysis(audioAnalysisRef.current);
    };
  }, []);

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
    options: {
      onSuccess: (data: { isComplete: boolean; message: string; nextSectionHint: string }) => {
        if (data.nextSectionHint) {
          skipNextHintResetRef.current = true;
          setNextHint(data.nextSectionHint);
        }
      },
      onError: (error) => {
        console.error("Error submitting audio:", error);
      },
    },
  });

  // Upload audio and return promise so caller can await completion
  const uploadAudio = (formData: FormData) => {
    return submitAudio(formData);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS_16KHZ,
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setTimeElapsed(0);
      recordingStartTimeRef.current = Date.now();

      const audioAnalysis = createAudioAnalysisContext(stream);
      audioAnalysisRef.current = audioAnalysis;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsListening(true);

      const throttledUpdate = (bars: number[]) => {
        const now = Date.now();
        if (now - lastUpdateTimeRef.current >= 50) {
          lastUpdateTimeRef.current = now;
          setWaveformBars(bars);
        }
      };

      lastUpdateTimeRef.current = Date.now();
      const stopAnimation = startWaveformAnimation(audioAnalysis.analyser, throttledUpdate);
      stopWaveformAnimationRef.current = stopAnimation;
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
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
    if (!mediaRecorderRef.current) return;

    // Capture the time elapsed and section before stopping
    const capturedTimeElapsed = timeElapsed;

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        try {
          const wavBlob = await resampleAudioTo16kHz(blob);
          const file = new File([wavBlob], "recording.wav", {
            type: "audio/wav",
          });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("time_spent_seconds", capturedTimeElapsed.toString());

          await uploadAudio(formData);
          toast.success("Answer recorded");
          setHasAnswered(true);
          onComplete();
        } catch (error) {
          console.error("Error submitting audio:", error);
          toast.error("Failed to submit. Please try again.");
        }
      };
      stopRecording();
    }
  };

  const showAnalyzeActions = currentStep === totalSteps && hasAnswered && Boolean(onAnalyze);

  return (
    <div className="flex flex-col px-6 py-8">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{sectionLabel}</h2>
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

      {/* Recording UI */}
      {isListening ? (
        <>
          {/* Main container with animated background */}
          <div className="relative w-full max-w-3xl mx-auto overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-indigo-300 p-8 sm:p-12 md:p-16 shadow-2xl mb-6">
            {/* Animated gradient background */}
            <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-blue-200 via-purple-100 to-yellow-100 bg-[length:200%_200%]" />

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

              {/* Microphone circle with glow */}
              <div className="relative">
                {/* Outer glow - pulsing */}
                <div className="absolute inset-0 -m-8 sm:-m-12 animate-pulse rounded-full bg-purple-500/30 blur-3xl" />

                {/* Middle glow - rotating */}
                <div className="absolute inset-0 -m-6 sm:-m-8 animate-spin-slow rounded-full bg-gradient-to-r from-purple-500/40 via-blue-500/40 to-transparent blur-2xl" />

                <div className="relative flex size-20 items-center justify-center rounded-full border-4 border-indigo-400/50 bg-gradient-to-br from-pink-400 via-purple-300 to-cyan-300 shadow-xl">
                  <MicrophoneIcon className="size-10 text-indigo-700" />
                </div>
              </div>

              {/* Waveform bars */}
              <div className="flex h-16 sm:h-20 items-center justify-center gap-1 sm:gap-1.5">
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
              disabled={isUploading}
              className="btn btn-neutral"
            >
              {isUploading ? "Submitting..." : "Done"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex justify-between gap-1 mt-auto pt-6 flex-wrap">
          {!hasAnswered && hasPreviousSection && previousSection && (
            <button onClick={onRedoPrevious} className="btn btn-outline">
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
              disabled={isUploading}
              className="btn btn-primary text-white"
            >
              {isUploading ? "Uploading Answer..." : "Analyse Answer"}
            </button>
          )}

          {!showAnalyzeActions && (
            <button
              onClick={handleRecordClick}
              disabled={isUploading}
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
