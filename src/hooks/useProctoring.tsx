"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ProctoringViolationReason = "tab_switch" | "fullscreen_exit";
type Signal = { interviewId: number; reason: ProctoringViolationReason; eventId: string };
type Options = {
  enabled: boolean;
  interviewId: number | null;
  reportViolation: (input: Signal) => Promise<unknown>;
};

/** Browser observations are uncertain evidence, never an automatic verdict. */
export function useProctoring({ enabled, interviewId, reportViolation }: Options) {
  const [showPreflight, setShowPreflight] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [notice, setNotice] = useState<ProctoringViolationReason | null>(null);
  const [reportState, setReportState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const pending = useRef<Signal | null>(null);
  const saving = useRef(false);
  const fullscreenEngaged = useRef(false);
  const lastSignal = useRef(0);
  const reportRef = useRef(reportViolation);
  reportRef.current = reportViolation;

  const saveSignal = useCallback(async () => {
    if (!pending.current || saving.current) return;
    saving.current = true;
    const signal = pending.current;
    setReportState("saving");
    try {
      await reportRef.current(signal);
      if (pending.current === signal) pending.current = null;
      setReportState("saved");
    } catch {
      setReportState("failed");
    } finally {
      saving.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isActive || !interviewId) return;
    const observe = (reason: ProctoringViolationReason) => {
      if (Date.now() - lastSignal.current < 2000 || pending.current) return;
      lastSignal.current = Date.now();
      pending.current = { interviewId, reason, eventId: crypto.randomUUID() };
      setNotice(reason);
      void saveSignal();
    };
    const visibility = () => {
      if (document.hidden) observe("tab_switch");
    };
    const fullscreen = () => {
      if (document.fullscreenElement) fullscreenEngaged.current = true;
      else if (fullscreenEngaged.current) {
        fullscreenEngaged.current = false;
        observe("fullscreen_exit");
      }
    };
    const retry = () => {
      void saveSignal();
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("online", retry);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("online", retry);
    };
  }, [enabled, isActive, interviewId, saveSignal]);

  const beginProctoredSession = useCallback(async () => {
    if (!enabled) return;
    try {
      await document.documentElement.requestFullscreen?.();
      fullscreenEngaged.current = !!document.fullscreenElement;
    } catch {
      /* Unsupported/denied fullscreen is not misconduct. */
    }
    setShowPreflight(false);
    setIsActive(true);
  }, [enabled]);

  return {
    showPreflight,
    isActive,
    notice,
    reportState,
    openPreflight: () => {
      if (enabled) setShowPreflight(true);
    },
    closePreflight: () => setShowPreflight(false),
    acknowledge: () => setNotice(null),
    retryReport: saveSignal,
    beginProctoredSession,
  };
}

export function ProctoringPreflightModal({
  isOpen,
  onBegin,
  onCancel,
}: {
  isOpen: boolean;
  onBegin: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <dialog open className="modal modal-open" aria-labelledby="assessment-ready-title">
      <div className="modal-box bg-white text-slate-900">
        <h2 id="assessment-ready-title" className="text-xl font-semibold">
          Ready for your assessment?
        </h2>
        <ul className="list-disc space-y-3 pl-5 py-5 text-sm leading-relaxed">
          <li>Answer by voice, using your own understanding.</li>
          <li>Keep this tab open. We will request fullscreen if your browser supports it.</li>
          <li>
            Tab changes and fullscreen exits may be recorded for review. They do not automatically
            end your assessment or prove cheating.
          </li>
          <li>Your timer keeps running during interruptions. Saved answers stay saved.</li>
        </ul>
        <div className="modal-action">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Not yet
          </button>
          <button type="button" className="btn bg-black text-white" onClick={onBegin}>
            Begin assessment
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function AssessmentInterruptionNotice({
  reason,
  reportState,
  onRetry,
  onContinue,
}: {
  reason: ProctoringViolationReason;
  reportState: string;
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <section
      role="status"
      aria-label="Assessment interruption"
      className="my-3 rounded-xl border border-[#DEE8FB] bg-[#F5F9FF] p-4 text-sm text-[#1F285B]"
    >
      <h2 className="font-semibold">
        {reason === "fullscreen_exit" ? "Fullscreen closed" : "Welcome back"}
      </h2>
      <p className="mt-1">
        Your assessment is still active. Saved answers are safe and your timer continues. Return to
        the current question when ready.
      </p>
      <p className="mt-2 text-xs">
        {reportState === "failed"
          ? "The interruption could not be recorded. You can retry without losing your answer."
          : reportState === "saving"
            ? "Recording the interruption…"
            : "This browser signal may be reviewed; it is not a cheating verdict."}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {reportState === "failed" && (
          <button type="button" className="underline" onClick={onRetry}>
            Retry recording interruption
          </button>
        )}
        <button type="button" className="font-semibold underline" onClick={onContinue}>
          Continue answering
        </button>
      </div>
    </section>
  );
}
