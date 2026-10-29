"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_CONSTRAINTS_16KHZ } from "@/lib/audio-utils";

type Status = "idle" | "requesting" | "recording" | "stopping" | "stopped";

/** Owns one recording. Late permission grants and late recorder events cannot revive it. */
export function useDrillRecorder(resetKey: string | number) {
  const [status, setStatus] = useState<Status>("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const alive = useRef(false);
  const busy = useRef(false);

  const dispose = useCallback(() => {
    generation.current += 1;
    const current = recorder.current;
    recorder.current = null;
    if (current) {
      current.ondataavailable = null;
      current.onstop = null;
      current.onerror = null;
      if (current.state !== "inactive") current.stop();
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    busy.current = false;
  }, []);

  useEffect(() => {
    alive.current = true;
    setStatus("idle");
    setBlob(null);
    setError("");
    return () => {
      alive.current = false;
      dispose();
    };
  }, [resetKey, dispose]);

  const start = useCallback(async () => {
    if (busy.current || !alive.current) return;
    busy.current = true;
    const revision = ++generation.current;
    setError("");
    setBlob(null);
    setStatus("requesting");
    let acquired: MediaStream | null = null;
    try {
      acquired = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS_16KHZ });
      if (!alive.current || revision !== generation.current) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = acquired;
      const current = new MediaRecorder(acquired);
      recorder.current = current;
      const chunks: Blob[] = [];
      const active = () => alive.current && revision === generation.current;
      current.ondataavailable = (event) => {
        if (active() && event.data.size) chunks.push(event.data);
      };
      current.onstop = () => {
        acquired?.getTracks().forEach((track) => track.stop());
        if (!active()) return;
        busy.current = false;
        const result = new Blob(chunks, {
          type: current.mimeType || chunks[0]?.type || "audio/webm",
        });
        if (!result.size) {
          setError("No audio was captured. Check your microphone and record again.");
          setStatus("idle");
          return;
        }
        setBlob(result);
        setStatus("stopped");
      };
      current.onerror = () => {
        if (!active()) return;
        dispose();
        setStatus("idle");
        setError("Recording stopped unexpectedly. Check your microphone and try again.");
      };
      current.start();
      setStatus("recording");
    } catch {
      acquired?.getTracks().forEach((track) => track.stop());
      if (!alive.current || revision !== generation.current) return;
      dispose();
      setStatus("idle");
      setError(
        "Could not record. Allow microphone access and check that another app is not using it."
      );
    }
  }, [dispose]);

  const stop = useCallback(() => {
    const current = recorder.current;
    if (!current || current.state === "inactive") return;
    setStatus("stopping");
    current.stop();
    // onstop delivers the final chunk asynchronously. Do not enable submission yet.
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);
  const reset = useCallback(() => {
    dispose();
    setStatus("idle");
    setBlob(null);
    setError("");
  }, [dispose]);
  return { status, blob, error, start, stop, reset };
}
