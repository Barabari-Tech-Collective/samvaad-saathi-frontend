import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import {
  AUDIO_CONSTRAINTS_16KHZ,
  cleanupAudioAnalysis,
  createAudioAnalysisContext,
  resampleAudioTo16kHz,
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
import { MicrophoneIcon } from "@heroicons/react/24/solid";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FollowUpQuestion, TranscribeResponse } from "../types";

// Mirrors the backend's FILLER_WORDS set (src/services/pacing_practice_service.py)
// so the live count roughly matches what the scored transcript would flag -
// unambiguous non-lexical fillers only, no contextual words like "like"/"actually".
const FILLER_WORDS = new Set([
  "um",
  "uh",
  "hmm",
  "hm",
  "er",
  "ah",
  "erm",
  "uhh",
  "umm",
  "ahh",
  "uhm",
  "mhm",
  "ugh",
]);

function normalizeWord(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/^[.,!?;:]+|[.,!?;:]+$/g, "");
}

/** Splits caption text into renderable segments, flagging filler words so
 * they can be highlighted inline without losing the original whitespace. */
function splitCaptionForHighlight(caption: string): { text: string; isFiller: boolean }[] {
  if (!caption) return [];
  return caption.split(/(\s+)/).map((token) => ({
    text: token,
    isFiller: FILLER_WORDS.has(normalizeWord(token)),
  }));
}

// SpeechRecognition is a non-standard, experimental Web API (Chrome/Edge
// only) and isn't part of TypeScript's "dom" lib. Used here only as a
// best-effort live-captions preview while the student is speaking - it
// never touches the actual audio upload/transcription/scoring pipeline,
// which still runs entirely through Groq/Whisper as before.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface FooterProps {
  isLoading?: boolean;
  disabled?: boolean;
  question_attempt_id?: number;
  /** When "llm_transcription_based", follow-up comes from transcription API - Next is disabled until it completes */
  followUpStrategy?: string | null;
  /** True when current question is a follow-up (child); "Generating Follow-up..." is only shown for parent with llm_transcription_based */
  isCurrentQuestionFollowUp?: boolean;
  onNext?: () => void;
  isLastQuestion?: boolean;
  onSubmit?: () => void;
  onFollowUpQuestion?: (followUpQuestion: FollowUpQuestion) => void;
  isIntroStep?: boolean;
}

const Footer = ({
  isLoading = false,
  disabled = false,
  question_attempt_id,
  followUpStrategy = null,
  isCurrentQuestionFollowUp = false,
  onNext,
  isLastQuestion = false,
  onSubmit,
  onFollowUpQuestion,
  isIntroStep = false,
}: FooterProps) => {
  const [isListening, setIsListening] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0));
  const [liveCaption, setLiveCaption] = useState("");
  const [captionsSupported, setCaptionsSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioAnalysisRef = useRef<AudioAnalysisContext | null>(null);
  const stopWaveformAnimationRef = useRef<(() => void) | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const apiClient = createApiClient(APIService.TRANSCRIBE);

  // Feature-detected once on mount (client-only - window isn't available
  // during SSR). Chrome/Edge only; other browsers just get no captions UI.
  useEffect(() => {
    setCaptionsSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Live filler-word count from the browser's own captions, purely as a
  // self-awareness aid while speaking - not tied to the actual scored
  // filler-word metric, which is computed server-side from the Whisper
  // transcript after upload.
  const fillerCount = useMemo(() => {
    if (!liveCaption) return 0;
    return liveCaption
      .split(/\s+/)
      .map(normalizeWord)
      .filter((word) => FILLER_WORDS.has(word)).length;
  }, [liveCaption]);

  // Best-effort live transcript while the student is speaking. This is a
  // separate engine (browser Web Speech API) from the Groq/Whisper call
  // that produces the real, scored transcript after upload - the two can
  // disagree slightly, which is why the UI below labels this a preview.
  const startLiveCaptions = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    setLiveCaption("");
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      // Each result is its own recognition segment, and the API does not
      // guarantee a boundary space between them - it drops the gap
      // entirely across a pause (e.g. "real" + "life" -> "reallife").
      // Trimming each segment and rejoining with an explicit space fixes
      // that regardless of what whitespace the engine did or didn't include.
      const segments: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript.trim();
        if (segment) segments.push(segment);
      }
      setLiveCaption(segments.join(" "));
    };
    recognition.onerror = (event) => {
      // Never surfaced to the student and never affects the actual answer
      // upload/scoring pipeline - captions are a best-effort visual aid only.
      console.warn("Live caption recognition error:", event.error);
    };
    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopLiveCaptions = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped/errored - fine, this is best-effort.
      }
      recognitionRef.current = null;
    }
    setLiveCaption("");
  };

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
    return () => {
      if (stopWaveformAnimationRef.current) {
        stopWaveformAnimationRef.current();
      }
      cleanupAudioAnalysis(audioAnalysisRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
      stopLiveCaptions();
    };
  }, []);

  // Reset timer and state when question changes
  useEffect(() => {
    setTimeRemaining(180);
    setHasAnswered(false);
    setIsListening(false);
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      // Stop all tracks
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    }
    // Clear chunks
    chunksRef.current = [];
    // Stop waveform animation
    if (stopWaveformAnimationRef.current) {
      stopWaveformAnimationRef.current();
      stopWaveformAnimationRef.current = null;
    }
    // Clean up audio analysis
    cleanupAudioAnalysis(audioAnalysisRef.current);
    audioAnalysisRef.current = null;
    setWaveformBars(Array(20).fill(0));
    // Clear timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    // Reset media recorder ref
    mediaRecorderRef.current = null;
    stopLiveCaptions();
  }, [question_attempt_id]);

  // Timer countdown effect
  useEffect(() => {
    if (isListening && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
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
  }, [isListening, timeRemaining]);

  const { mutateAsync: completeAnalysis, isPending: isCompletingAnalysis } = apiClient.useMutation({
    url: ENDPOINTS.ANALYSIS.COMPLETE,
    method: "post",
  });

  const { mutateAsync: uploadAudio, isPending: isUploading } = apiClient.useMutation({
    url: ENDPOINTS.TRANSCRIBE.WHISPER,
    method: "post",
    config: {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
    options: {
      onSuccess: (response: TranscribeResponse, variables: FormData) => {
        const attemptId = variables.get("question_attempt_id");
        if (attemptId) {
          completeAnalysis({
            question_attempt_id: Number(attemptId),
            analysisTypes: ["domain", "communication", "pace", "pause"],
          });
        } else {
          console.error("Missing question_attempt_id in Footer upload variables");
        }
        setHasAnswered(true);

        // Track answer recorded
        if (startTimeRef.current > 0) {
          const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
          trackAnswerRecorded(duration);
        }

        // Handle follow-up question if generated
        if (response?.followUpGenerated && response?.followUpQuestion && onFollowUpQuestion) {
          onFollowUpQuestion(response.followUpQuestion);
        }
      },
    },
  });

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (isListening && timeRemaining === 0 && mediaRecorderRef.current) {
      const autoSubmit = async () => {
        if (!mediaRecorderRef.current) return;

        return new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: "audio/webm" });

              try {
                // Resample to 16kHz WAV
                const wavBlob = await resampleAudioTo16kHz(blob);
                const file = new File([wavBlob], "recording.wav", {
                  type: "audio/wav",
                });

                if (question_attempt_id) {
                  const formData = new FormData();
                  formData.append("question_attempt_id", question_attempt_id.toString());
                  formData.append("language", "en");
                  formData.append("file", file);

                  await uploadAudio(formData);
                } else if (followUpStrategy === "llm_transcription_based" || isIntroStep) {
                  setHasAnswered(true);
                }
              } catch (error) {
                console.error("Error processing audio:", error);
              }
              resolve();
            };
            stopRecording();
          }
        });
      };
      autoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isListening, question_attempt_id]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS_16KHZ,
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setTimeRemaining(180); // Reset timer to 3 minutes

      // Set up audio analysis for waveform
      const audioAnalysis = createAudioAnalysisContext(stream);
      audioAnalysisRef.current = audioAnalysis;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      startTimeRef.current = Date.now();
      startLiveCaptions();

      // Throttled callback to reduce state updates
      // Update state at most every 50ms (~20fps) instead of every frame (~60fps)
      const throttledUpdate = (bars: number[]) => {
        const now = Date.now();
        if (now - lastUpdateTimeRef.current >= 50) {
          lastUpdateTimeRef.current = now;
          setWaveformBars(bars);
        }
      };

      // Start waveform animation with throttled updates
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
      stopLiveCaptions();

      // Stop waveform animation
      if (stopWaveformAnimationRef.current) {
        stopWaveformAnimationRef.current();
        stopWaveformAnimationRef.current = null;
      }

      // Clean up audio analysis
      cleanupAudioAnalysis(audioAnalysisRef.current);
      audioAnalysisRef.current = null;
      setWaveformBars(Array(20).fill(0));

      // Clear timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleAnswerClick = () => {
    trackAnswerStartClick();
    startRecording();
  };

  const isWaitingForFollowUpFromTranscription =
    followUpStrategy === "llm_transcription_based" && isUploading;

  const handleStopListening = async () => {
    setHasAnswered(true);

    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });

          try {
            // Resample to 16kHz WAV
            const wavBlob = await resampleAudioTo16kHz(blob);
            const file = new File([wavBlob], "recording.wav", {
              type: "audio/wav",
            });

            if (question_attempt_id) {
              const formData = new FormData();
              formData.append("question_attempt_id", question_attempt_id.toString());
              formData.append("language", "en");
              formData.append("file", file);

              await uploadAudio(formData);
            } else if (followUpStrategy === "llm_transcription_based" || isIntroStep) {
              // No attempt id - allow user to proceed
              setHasAnswered(true);
            }
          } catch (error) {
            console.error("Error processing audio:", error);
            // Allow user to proceed if transcription fails for llm_transcription_based or isIntroStep
            if (followUpStrategy === "llm_transcription_based" || isIntroStep) {
              setHasAnswered(true);
            }
          }
          resolve();
        };
        stopRecording();
      }
    });
  };

  const handleRedo = () => {
    if (question_attempt_id) {
      trackRedoButtonClick(question_attempt_id.toString(), 1); // We don't have attempt number readily available, keeping it 1 for now
    }
    stopRecording();
    chunksRef.current = [];
    setHasAnswered(false);
    setTimeRemaining(180); // Reset timer
    startRecording();
  };

  const handleNextClick = () => {
    // If user is currently recording, stop recording first
    if (isListening) {
      cleanupRecordingState();
    }

    if (hasAnswered) {
      if (onNext) {
        trackButtonClick("next_question", "interview_footer");
        onNext();
        setHasAnswered(false);
      }
    } else {
      setShowSkipModal(true);
    }
  };

  const handleSubmitClick = () => {
    trackButtonClick("submit_interview_open_modal", "interview_footer");
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = () => {
    trackSubmitInterviewClick();
    setShowSubmitModal(false);
    if (onSubmit) {
      onSubmit();
    }
  };

  const cleanupRecordingState = () => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      // Stop all tracks
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    }
    setIsListening(false);
    // Clear chunks
    chunksRef.current = [];
    // Stop waveform animation
    if (stopWaveformAnimationRef.current) {
      stopWaveformAnimationRef.current();
      stopWaveformAnimationRef.current = null;
    }
    // Clean up audio analysis
    cleanupAudioAnalysis(audioAnalysisRef.current);
    audioAnalysisRef.current = null;
    setWaveformBars(Array(20).fill(0));
    // Clear timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    // Reset media recorder ref
    mediaRecorderRef.current = null;
    stopLiveCaptions();
  };

  const handleConfirmSkip = () => {
    setShowSkipModal(false);

    // Track skip event
    trackSkipQuestionClick();

    // Clean up any ongoing recording state when skipping
    cleanupRecordingState();

    // Reset answer state
    setHasAnswered(false);
    setTimeRemaining(180);

    if (isLastQuestion) {
      setShowSubmitModal(true);
    } else {
      if (onNext) {
        onNext();
      }
    }
  };

  return (
    <div className="w-full py-4 transition-all duration-300 ease-in-out flex flex-col items-center justify-center max-w-5xl mx-auto">
      {/* Skip Confirmation Modal */}
      <dialog className={`modal ${showSkipModal ? "modal-open" : ""} backdrop-blur-sm`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg text-slate-800">Skip Question?</h3>
          <p className="py-4 text-slate-600">Are you sure you want to skip this question?</p>
          <div className="modal-action">
            <button
              onClick={() => setShowSkipModal(false)}
              className="btn btn-ghost text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSkip}
              className="btn bg-primary text-white hover:bg-primary/90 border-none"
            >
              Yes, Skip
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowSkipModal(false)}>close</button>
        </form>
      </dialog>

      {/* Submit Confirmation Modal */}
      <dialog className={`modal ${showSubmitModal ? "modal-open" : ""} backdrop-blur-sm`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg text-slate-800">Submit Interview?</h3>
          <p className="py-4 text-slate-600">Are you sure you want to submit the interview?</p>
          <div className="modal-action">
            <button
              onClick={() => setShowSubmitModal(false)}
              className="btn btn-ghost text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSubmit}
              className="btn bg-primary text-white hover:bg-primary/90 border-none"
            >
              Yes, Submit
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowSubmitModal(false)}>close</button>
        </form>
      </dialog>

      {isLoading ? (
        <div className="flex justify-between items-center w-full animate-pulse">
          <div className="h-12 w-32 bg-slate-200 rounded-md"></div>
          <div className="h-12 w-24 bg-slate-200 rounded-md"></div>
        </div>
      ) : !isListening ? (
        <div className="flex justify-between items-center animate-fade-in w-full">
          {!hasAnswered ? (
            <button
              onClick={handleAnswerClick}
              disabled={disabled}
              className="btn bg-primary hover:bg-primary/90 text-white "
            >
              Answer <MicrophoneIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleRedo}
              disabled={disabled}
              className="btn bg-primary hover:bg-primary/90 text-white"
            >
              Redo <MicrophoneIcon className="h-5 w-5" />
            </button>
          )}

          {isLastQuestion ? (
            <button
              onClick={handleSubmitClick}
              disabled={disabled || isUploading || isCompletingAnalysis}
              className="btn btn-primary text-white"
            >
              {isCompletingAnalysis ? "Submitting..." : "Submit"}
            </button>
          ) : (
            <button
              onClick={handleNextClick}
              disabled={
                isWaitingForFollowUpFromTranscription ||
                isUploading ||
                isCompletingAnalysis ||
                (isIntroStep && !hasAnswered)
              }
              className="btn btn-outline"
            >
              {isWaitingForFollowUpFromTranscription && !isCurrentQuestionFollowUp
                ? "Generating Follow-up..."
                : "Next"}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Main container with animated background */}
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-indigo-300 p-8 sm:p-12 md:p-16 shadow-2xl">
            {/* Animated gradient background */}
            <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-blue-200 via-purple-100 to-yellow-100 bg-[length:200%_200%]" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8">
              {/* Listening text */}
              <h2 className="text-lg sm:text-xl font-medium text-gray-800 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Listening...
              </h2>

              {/* Timer */}
              <div className="text-xl sm:text-4xl font-semibold text-indigo-700 tabular-nums">
                {formatTime(timeRemaining)}
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

              {/* Live captions - best-effort browser-side preview, not the
                  scored transcript (that comes back from Groq/Whisper after
                  upload). Chrome/Edge only; silently omitted elsewhere.
                  Filler words ("um", "uh", ...) are highlighted inline and
                  counted so the student gets real-time self-awareness feedback
                  while speaking, separate from the post-answer scored metric. */}
              {captionsSupported && (
                <div className="w-full max-w-md px-2 text-center">
                  <p className="min-h-[1.5em] break-words text-sm italic text-gray-700 sm:text-base">
                    {liveCaption
                      ? splitCaptionForHighlight(liveCaption).map((part, index) =>
                          part.isFiller ? (
                            <mark
                              key={index}
                              className="rounded bg-amber-200 px-0.5 not-italic text-amber-900"
                            >
                              {part.text}
                            </mark>
                          ) : (
                            <React.Fragment key={index}>{part.text}</React.Fragment>
                          )
                        )
                      : "Listening for your voice…"}
                  </p>
                  {fillerCount > 0 && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Filler words so far: {fillerCount}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-500">
                    Live preview only — may differ slightly from your final transcript
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end items-center w-full">
            <button
              onClick={handleStopListening}
              disabled={disabled}
              className="btn btn-primary text-white mt-4"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Footer;
