"use client";

import { useState, useEffect, useRef } from "react";
import { MicrophoneIcon, ArrowPathIcon, SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { useMicPermission, MicPermissionModal } from "@/hooks/useMicPermission";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { AUDIO_CONSTRAINTS_16KHZ, resampleAudioTo16kHz } from "@/lib/audio-utils";
import type {
  CreatePacingSessionResponse,
  SubmitPacingSessionResponse,
} from "@/lib/pacing-practice/types";
const PracticePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const levelParam = searchParams.get("level");
  const level = levelParam ? Number(levelParam) : 1;

  const [recordingStatus, setRecordingStatus] = useState<"idle" | "recording" | "stopped">("idle");
  const [timer, setTimer] = useState(0);
  const [session, setSession] = useState<CreatePacingSessionResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { hasPermission, showModal, requestPermission, showPermissionModal, hidePermissionModal } =
    useMicPermission();

  const apiClient = createApiClient(APIService.PACING);

  const { mutateAsync: createSession, isPending: isCreatingSession } = apiClient.useMutation<
    CreatePacingSessionResponse,
    { level: number }
  >({
    url: ENDPOINTS.PACING.SESSION_CREATE,
    method: "post",
    errorMessage: "Failed to start practice session. Please try again.",
  });

  const { mutateAsync: submitAudio, isPending: isSubmitting } = apiClient.useMutation<
    SubmitPacingSessionResponse,
    FormData
  >({
    url: session ? ENDPOINTS.PACING.SESSION_SUBMIT(String(session.sessionId)) : "",
    method: "post",
    config: {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
    keyToInvalidate: { queryKey: ["pacing-levels"] },
    options: {
      onSuccess: (_data) => {
        if (session) {
          router.push(`/control-your-pace/report?sessionId=${session.sessionId}`);
        }
      },
    },
  });

  // Redirect if no level
  useEffect(() => {
    if (!levelParam || Number.isNaN(level)) {
      router.replace("/control-your-pace/levels");
      return;
    }
  }, [levelParam, level, router]);

  // Create session when level is available
  useEffect(() => {
    if (!levelParam || Number.isNaN(level) || session) return;
    createSession({ level })
      .then(setSession)
      .catch(() => {
        router.replace("/control-your-pace/levels");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when level/session change
  }, [level, levelParam, session]);

  useEffect(() => {
    if (recordingStatus === "recording") {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    if (!hasPermission) {
      showPermissionModal();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS_16KHZ,
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      mediaRecorder.start();
      setTimer(0);
      setRecordingStatus("recording");
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    setRecordingStatus("stopped");
  };

  const handleRetry = () => {
    setTimer(0);
    setRecordingStatus("idle");
    chunksRef.current = [];
  };

  const handleReplay = () => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
    });
  };

  const handleViewReport = async () => {
    if (!session || chunksRef.current.length === 0) return;
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const wavBlob = await resampleAudioTo16kHz(blob);
      const file = new File([wavBlob], "recording.wav", { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", file);
      await submitAudio(formData);
    } catch (err) {
      console.error("Error submitting audio:", err);
    }
  };

  if (isCreatingSession || (!session && levelParam)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full bg-white p-6">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-sm text-gray-600 mt-4">Starting practice session...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col items-center min-h-full bg-white p-6 relative">
      <h1 className="text-gray-400 text-lg mb-12">Speech Pacing Practice</h1>

      {/* Timer */}
      <div
        className={clsx(
          "text-5xl font-mono font-bold mb-16",
          recordingStatus === "recording" ? "text-red-500" : "text-black"
        )}
      >
        {formatTime(timer)}
      </div>

      {/* Sentence Card */}
      <div className="card bg-white shadow-xl border border-gray-100 p-8 mb-6 text-center w-full max-w-sm">
        <p className="text-lg font-bold text-black leading-relaxed">
          &ldquo;{session.promptText}&rdquo;
        </p>
      </div>

      <p className="text-gray-400 text-sm mb-16">Speak Naturally. Don&apos;t Rush</p>

      {/* Controls */}
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        {recordingStatus === "idle" && (
          <button
            onClick={handleStartRecording}
            className="btn btn-primary btn-block btn-lg rounded-full bg-blue-600 hover:bg-blue-700 border-none text-white font-bold"
          >
            <MicrophoneIcon className="w-5 h-5 mr-2" />
            Start Recording
          </button>
        )}

        {recordingStatus === "recording" && (
          <button
            onClick={handleStopRecording}
            className="btn btn-error btn-block btn-lg rounded-full bg-red-500 hover:bg-red-600 border-none text-white font-bold"
          >
            Stop
          </button>
        )}

        {recordingStatus === "stopped" && (
          <div className="w-full flex flex-col items-center">
            <div className="flex flex-col items-center gap-2 mb-8">
              <button
                onClick={handleRetry}
                className="btn btn-circle bg-yellow-400 hover:bg-yellow-500 border-none text-black"
              >
                <ArrowPathIcon className="w-6 h-6" />
              </button>
              <span className="text-xs text-gray-500">Retry</span>
            </div>

            <div className="flex items-center gap-4 w-full">
              <button
                type="button"
                onClick={handleReplay}
                className="btn btn-circle bg-gray-100 border-none text-black shadow-sm shrink-0"
                aria-label="Replay recording"
                title="Replay recording"
              >
                <SpeakerWaveIcon className="w-5 h-5" />
              </button>

              <button
                onClick={handleViewReport}
                disabled={isSubmitting}
                className="btn btn-primary btn-lg rounded-full bg-blue-600 hover:bg-blue-700 border-none text-white font-bold flex-1"
              >
                {isSubmitting ? "Submitting..." : "View Report"}
              </button>
            </div>
          </div>
        )}
      </div>

      <MicPermissionModal
        isOpen={showModal}
        onClose={hidePermissionModal}
        onRequestPermission={requestPermission}
      />
    </div>
  );
};

export default PracticePage;
