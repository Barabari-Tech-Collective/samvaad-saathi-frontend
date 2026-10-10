"use client";

import { useEffect, useRef, useState } from "react";
import { AUDIO_CONSTRAINTS_16KHZ, resampleAudioTo16kHz } from "@/lib/audio-utils";

export type AnswerPhase = "idle" | "requesting" | "recording" | "saving" | "failed" | "saved";

interface Options {
  save: (file: File) => Promise<void>;
  onStream?: (stream: MediaStream) => void;
  onStop?: () => void;
}

const RECORDING_SECONDS = 180;
/** How long to wait for the browser permission prompt before giving up on it.
 *  Short on purpose: students should get a usable screen back quickly rather
 *  than watch a stalled control. A grant that lands later is released, and the
 *  browser remembers the decision, so a second Answer press starts instantly. */
const MIC_PERMISSION_TIMEOUT_MS = 5_000;

/** Owns one question's recording. Mount a new instance for each question. */
export function useInterviewAnswer({ save, onStream, onStop }: Options) {
  const [phase, setPhase] = useState<AnswerPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(RECORDING_SECONDS);
  const phaseRef = useRef<AnswerPhase>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef<Blob | null>(null);
  const fileRef = useRef<File | null>(null);
  const pendingRef = useRef<Promise<boolean> | null>(null);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const startedAtRef = useRef(0);
  const optionsRef = useRef({ save, onStream, onStop });
  optionsRef.current = { save, onStream, onStop };

  function transition(next: AnswerPhase) {
    phaseRef.current = next;
    if (mountedRef.current) setPhase(next);
  }

  function releaseStream() {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    optionsRef.current.onStop?.();
  }

  async function saveRecording(): Promise<boolean> {
    transition("saving");
    setError(null);
    try {
      if (!fileRef.current) {
        const recording = recordingRef.current;
        if (!recording?.size) throw new Error("EMPTY_RECORDING");
        const wav = await resampleAudioTo16kHz(recording);
        fileRef.current = new File([wav], "recording.wav", { type: "audio/wav" });
      }
      if (!mountedRef.current) return false;
      await optionsRef.current.save(fileRef.current);
      if (!mountedRef.current) return false;
      recordingRef.current = null;
      fileRef.current = null;
      transition("saved");
      return true;
    } catch {
      if (mountedRef.current) {
        setError(
          recordingRef.current?.size
            ? "Your answer has not been saved. Keep this page open and select Retry save."
            : "No audio was captured. Please record your answer again."
        );
        transition(recordingRef.current?.size ? "failed" : "idle");
      }
      return false;
    }
  }

  function stop(): Promise<boolean> {
    if (pendingRef.current) return pendingRef.current;
    const recorder = recorderRef.current;
    if (phaseRef.current === "saved") return Promise.resolve(true);
    if (phaseRef.current !== "recording" || !recorder) return Promise.resolve(false);
    transition("saving");
    pendingRef.current = new Promise<boolean>((resolve) => {
      recorder.onstop = () => {
        releaseStream();
        if (!mountedRef.current) {
          resolve(false);
          return;
        }
        void saveRecording().then(resolve);
      };
      try {
        recorder.stop();
      } catch {
        releaseStream();
        if (recordingRef.current?.size) {
          void saveRecording().then(resolve);
        } else {
          setError("Recording stopped unexpectedly. Please record your answer again.");
          transition("idle");
          resolve(false);
        }
      }
    }).finally(() => {
      pendingRef.current = null;
    });
    return pendingRef.current;
  }

  /** Abandons a microphone request so a pending permission prompt cannot hold the
   *  student for the full acquisition timeout when they would rather move on. */
  function cancel() {
    if (phaseRef.current !== "requesting") return;
    cancelledRef.current = true;
    setError(null);
    transition("idle");
  }

  async function start() {
    if (!["idle", "saved"].includes(phaseRef.current)) return;
    const previousPhase = phaseRef.current;
    cancelledRef.current = false;
    transition("requesting");
    setError(null);
    let stream: MediaStream | undefined;
    let permissionExpired = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS_16KHZ });
      // The browser permission dialog cannot be cancelled; dispose of a late grant.
      void permission.then(
        (result) => {
          if (permissionExpired || cancelledRef.current || !mountedRef.current)
            result.getTracks().forEach((track) => track.stop());
        },
        () => undefined
      );
      stream = await Promise.race([
        permission,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            permissionExpired = true;
            reject(new Error("MIC_TIMEOUT"));
          }, MIC_PERMISSION_TIMEOUT_MS);
        }),
      ]);
      // A late grant must never start recording on a question the student has
      // cancelled or moved past, and must not leave the phase stuck at
      // "requesting" - that latched both Answer and Next off with no way out.
      if (cancelledRef.current || !mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        if (mountedRef.current && phaseRef.current === "requesting") transition(previousPhase);
        return;
      }
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recordingRef.current = null;
      fileRef.current = null;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
        recordingRef.current = new Blob(chunks, { type: recorder.mimeType || event.data.type });
      };
      recorder.onerror = () => {
        void stop();
      };
      recorder.onstop = () => {
        // Devices can disappear without the student pressing Done.
        if (mountedRef.current && phaseRef.current === "recording") {
          releaseStream();
          pendingRef.current = saveRecording().finally(() => {
            pendingRef.current = null;
          });
        }
      };
      recorder.start(1000);
      startedAtRef.current = Date.now();
      setTimeRemaining(RECORDING_SECONDS);
      transition("recording");
      // Visualisation and captions are optional; their failure must not break capture.
      try {
        optionsRef.current.onStream?.(stream);
      } catch {
        /* audio still records */
      }
    } catch (startError) {
      stream?.getTracks().forEach((track) => track.stop());
      // A deliberate cancellation is not a microphone fault, so it must not leave
      // an error behind or undo the idle phase cancel() already applied.
      if (!cancelledRef.current) {
        // An unanswered prompt is not a denial. Saying "unavailable" to a student
        // who was still reading the browser dialog is both wrong and alarming,
        // and the short timeout makes that the common case rather than a rare one.
        setError(
          (startError as Error)?.message === "MIC_TIMEOUT"
            ? "We did not get microphone access yet. Choose Allow in your browser, then select Answer again."
            : "Microphone unavailable. Allow microphone access, then select Answer again."
        );
        transition(previousPhase);
      }
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  function retry(): Promise<boolean> {
    if (pendingRef.current) return pendingRef.current;
    if (phaseRef.current !== "failed") return Promise.resolve(false);
    pendingRef.current = saveRecording().finally(() => {
      pendingRef.current = null;
    });
    return pendingRef.current;
  }

  function discard() {
    if (phaseRef.current !== "failed" || pendingRef.current) return;
    recordingRef.current = null;
    fileRef.current = null;
    setError(null);
    transition("idle");
  }

  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        RECORDING_SECONDS - Math.floor((Date.now() - startedAtRef.current) / 1000)
      );
      setTimeRemaining(remaining);
      if (remaining === 0) void stopRef.current();
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    mountedRef.current = true;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (["recording", "saving", "failed"].includes(phaseRef.current)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recorder?.stream.getTracks().forEach((track) => track.stop());
      optionsRef.current.onStop?.();
    };
  }, []);

  return { phase, error, timeRemaining, start, stop, retry, discard, cancel };
}
