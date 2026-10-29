"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { pacingRequestKey, clearPacingRequestKey } from "@/lib/pacing-practice/creation-receipt";
import PageHeading from "@/components/studio/PageHeading";
import { useState, useEffect, useRef } from "react";
import { MicrophoneIcon, ArrowPathIcon, SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { useMicPermission, MicPermissionModal } from "@/hooks/useMicPermission";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { resampleAudioTo16kHz } from "@/lib/audio-utils";
import type {
  CreatePacingSessionResponse,
  SubmitPacingSessionResponse,
} from "@/lib/pacing-practice/types";
import { useDrillRecorder } from "@/hooks/useDrillRecorder";
const PracticePage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const account = user?.userId;
  const creationKey = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const levelParam = searchParams.get("level");
  const level = levelParam ? Number(levelParam) : 1;

  const recording = useDrillRecorder(level);
  const recordingStatus = recording.status;
  const [submitError, setSubmitError] = useState("");
  const [preparingReport, setPreparingReport] = useState(false);
  const submitting = useRef(false);
  const sessionRevision = useRef(0);
  const sessionRequest = useRef<{
    level: number;
    account: string;
    promise: Promise<CreatePacingSessionResponse>;
  } | null>(null);
  const [timer, setTimer] = useState(0);
  const [session, setSession] = useState<CreatePacingSessionResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackUrl = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { hasPermission, showModal, requestPermission, showPermissionModal, hidePermissionModal } =
    useMicPermission();

  const apiClient = createApiClient(APIService.PACING);

  const { mutateAsync: createSession, isPending: isCreatingSession } = apiClient.useMutation<
    CreatePacingSessionResponse,
    { level: number; clientRequestId: string }
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
  });

  useEffect(() => {
    let current = true;
    const revision = ++sessionRevision.current;
    setSession(null);
    setTimer(0);
    setSubmitError("");
    submitting.current = false;
    setPreparingReport(false);
    if (!levelParam || !Number.isSafeInteger(level) || level <= 0 || level > 3) {
      router.replace("/control-your-pace/levels");
      return;
    }
    if (!account) return;
    try {
      creationKey.current = pacingRequestKey(account, level);
    } catch {
      setSubmitError(
        "Practice cannot start because browser storage is unavailable. Enable session storage and reload."
      );
      return;
    }
    // Reuse only the pending request for this level across React effect replay.
    if (
      !sessionRequest.current ||
      sessionRequest.current.level !== level ||
      sessionRequest.current.account !== account
    ) {
      sessionRequest.current = {
        level,
        account,
        promise: createSession({ level, clientRequestId: creationKey.current }),
      };
    }
    sessionRequest.current.promise
      .then((data) => {
        if (current && revision === sessionRevision.current) {
          if (data.status === "completed") {
            clearPacingRequestKey(account, level, creationKey.current!);
            router.replace(`/control-your-pace/report?sessionId=${data.sessionId}`);
          } else setSession(data);
        }
      })
      .catch(() => {
        if (current && revision === sessionRevision.current)
          router.replace("/control-your-pace/levels");
      });
    return () => {
      current = false;
      sessionRevision.current += 1;
    };
    // The API factory creates a new mutation function on render; the route owns this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, levelParam, account]);

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

  const stopPlayback = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (playbackUrl.current) URL.revokeObjectURL(playbackUrl.current);
    playbackUrl.current = null;
  };
  useEffect(() => () => stopPlayback(), [level]);

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
    stopPlayback();
    setTimer(0);
    await recording.start();
  };

  const handleRetry = () => {
    if (submitting.current) return;
    stopPlayback();
    setTimer(0);
    setSubmitError("");
    recording.reset();
  };

  const handleReplay = () => {
    if (!recording.blob) return;
    stopPlayback();
    const url = URL.createObjectURL(recording.blob);
    playbackUrl.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    const finish = () => {
      if (audioRef.current === audio) stopPlayback();
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  };

  const handleViewReport = async () => {
    if (!session || !recording.blob || submitting.current) return;
    const revision = sessionRevision.current;
    submitting.current = true;
    setPreparingReport(true);
    setSubmitError("");
    stopPlayback();
    try {
      const wavBlob = await resampleAudioTo16kHz(recording.blob);
      if (revision !== sessionRevision.current) return;
      const formData = new FormData();
      formData.append("file", new File([wavBlob], "recording.wav", { type: "audio/wav" }));
      await submitAudio(formData);
      if (revision === sessionRevision.current) {
        if (account && creationKey.current)
          clearPacingRequestKey(account, level, creationKey.current);
        router.push(`/control-your-pace/report?sessionId=${session.sessionId}`);
      }
    } catch {
      if (revision !== sessionRevision.current) return;
      // A failed response is not proof that submission failed. Reconcile the
      // durable creation receipt before inviting another audio upload.
      try {
        if (account && creationKey.current) {
          const recovered = await createSession({ level, clientRequestId: creationKey.current });
          if (revision !== sessionRevision.current) return;
          if (recovered.status === "completed") {
            clearPacingRequestKey(account, level, creationKey.current);
            router.push(`/control-your-pace/report?sessionId=${recovered.sessionId}`);
            return;
          }
        }
      } catch {
        /* Keep the recording and original key if reconciliation also fails. */
      }
      if (revision === sessionRevision.current)
        setSubmitError(
          "Your recording is still here in this tab. We could not confirm a completed report. Keep this page open and try again."
        );
    } finally {
      if (revision === sessionRevision.current) {
        submitting.current = false;
        setPreparingReport(false);
      }
    }
  };

  if (!session && submitError) {
    return (
      <div className="studio-panel p-6">
        <p role="alert">{submitError}</p>
        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

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
    <div className="studio-panel studio-drill-room flex flex-col items-center">
      <PageHeading
        eyebrow="Speaking speed"
        title="Speak at your own pace."
        description="Read the prompt, take a breath, then record your response."
      />

      {/* Timer */}
      <div
        className={clsx(
          "text-4xl font-mono font-semibold mb-8",
          recordingStatus === "recording" ? "text-red-500" : "text-black"
        )}
      >
        {formatTime(timer)}
      </div>

      {/* Sentence Card */}
      <div className="studio-panel mb-6 text-center w-full">
        <p className="text-lg font-bold text-black leading-relaxed">
          &ldquo;{session.promptText}&rdquo;
        </p>
      </div>

      <p className="studio-muted text-sm mb-8">Speak Naturally. Don&apos;t Rush</p>

      {(recording.error || submitError) && (
        <p role="alert" className="text-red-700 mb-4">
          {recording.error || submitError}
        </p>
      )}
      {(recordingStatus === "requesting" || recordingStatus === "stopping") && (
        <p role="status" className="mb-4">
          {recordingStatus === "requesting"
            ? "Waiting for microphone access…"
            : "Finishing your recording…"}
        </p>
      )}
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
            onClick={recording.stop}
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
                disabled={preparingReport || isSubmitting}
                aria-label="Record again"
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
                disabled={preparingReport || isSubmitting}
                className="btn btn-primary btn-lg rounded-full bg-blue-600 hover:bg-blue-700 border-none text-white font-bold flex-1"
              >
                {preparingReport || isSubmitting ? "Submitting..." : "View Report"}
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
