"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type ProctoringViolationReason = "tab_switch" | "fullscreen_exit";
type Signal = { interviewId: number; reason: ProctoringViolationReason; eventId: string };
type Options = {
  enabled: boolean;
  interviewId: number | null;
  scopeKey?: string;
  reportViolation: (input: Signal) => Promise<unknown>;
};
type Session = {
  key: string;
  alive: boolean;
  active: boolean;
  beginning: number;
  serial: number;
  pending: Signal | null;
  saving: boolean;
  fullscreen: boolean;
  lastSignal: number;
};

/** Browser observations are uncertain evidence, never an automatic verdict. */
export function useProctoring({
  enabled,
  interviewId,
  scopeKey = "default",
  reportViolation,
}: Options) {
  const valid =
    enabled && Number.isSafeInteger(interviewId) && Number(interviewId) > 0 && !!scopeKey;
  const key = JSON.stringify([valid, interviewId, scopeKey]);
  const [view, setView] = useState({
    key,
    showPreflight: false,
    isActive: false,
    isBeginning: false,
    notice: null as ProctoringViolationReason | null,
    reportState: "idle" as "idle" | "saving" | "saved" | "failed",
  });
  const session = useRef<Session | null>(null);
  const reportRef = useRef(reportViolation);
  useLayoutEffect(() => {
    reportRef.current = reportViolation;
  }, [reportViolation]);
  useLayoutEffect(() => {
    const owner: Session = {
      key,
      alive: true,
      active: false,
      beginning: 0,
      serial: 0,
      pending: null,
      saving: false,
      fullscreen: false,
      lastSignal: -Infinity,
    };
    session.current = owner;
    setView({
      key,
      showPreflight: false,
      isActive: false,
      isBeginning: false,
      notice: null,
      reportState: "idle",
    });
    return () => {
      owner.alive = false;
      owner.active = false;
      owner.pending = null;
    };
  }, [key]);
  const update = useCallback((owner: Session, change: Partial<typeof view>) => {
    if (owner.alive && session.current === owner)
      setView((previous) => ({ ...previous, ...change, key: owner.key }));
  }, []);
  const saveSignal = useCallback(async () => {
    const owner = session.current;
    if (
      !valid ||
      !owner ||
      owner.key !== key ||
      !owner.alive ||
      !owner.active ||
      !owner.pending ||
      owner.saving
    )
      return;
    owner.saving = true;
    const signal = owner.pending;
    update(owner, { reportState: "saving" });
    try {
      await reportRef.current(signal);
      if (owner.pending === signal) owner.pending = null;
      update(owner, { reportState: "saved" });
    } catch {
      update(owner, { reportState: "failed" });
    } finally {
      owner.saving = false;
    }
  }, [key, valid, update]);

  const isActive = valid && view.key === key && view.isActive;
  useEffect(() => {
    const owner = session.current;
    if (!isActive || !owner || owner.key !== key || !interviewId) return;
    const observe = (reason: ProctoringViolationReason) => {
      if (
        !owner.alive ||
        session.current !== owner ||
        !owner.active ||
        Date.now() - owner.lastSignal < 2000 ||
        owner.pending
      )
        return;
      owner.lastSignal = Date.now();
      owner.pending = { interviewId, reason, eventId: crypto.randomUUID() };
      update(owner, { notice: reason });
      void saveSignal();
    };
    const visibility = () => {
      if (document.hidden) observe("tab_switch");
    };
    const fullscreen = () => {
      if (document.fullscreenElement) owner.fullscreen = true;
      else if (owner.fullscreen) {
        owner.fullscreen = false;
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
  }, [isActive, key, interviewId, saveSignal, update]);

  const beginProctoredSession = useCallback(async (): Promise<boolean> => {
    const owner = session.current;
    if (!valid || !owner || owner.key !== key || !owner.alive || owner.beginning) return false;
    if (owner.active) return true;
    const ticket = ++owner.serial;
    owner.beginning = ticket;
    update(owner, { isBeginning: true });
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* Unsupported/denied fullscreen is not misconduct. */
    }
    if (!owner.alive || session.current !== owner || owner.beginning !== ticket) return false;
    owner.beginning = 0;
    owner.active = true;
    owner.fullscreen = !!document.fullscreenElement;
    update(owner, { showPreflight: false, isActive: true, isBeginning: false });
    return true;
  }, [key, valid, update]);
  const visible = valid && view.key === key;
  return {
    showPreflight: visible && view.showPreflight,
    isActive,
    isBeginning: visible && view.isBeginning,
    notice: visible ? view.notice : null,
    reportState: visible ? view.reportState : "idle",
    openPreflight: () => {
      const owner = session.current;
      if (valid && owner?.key === key && !owner.active) update(owner, { showPreflight: true });
    },
    closePreflight: () => {
      const owner = session.current;
      if (owner?.key === key) {
        owner.beginning = 0;
        update(owner, { showPreflight: false, isBeginning: false });
      }
    },
    acknowledge: () => {
      const owner = session.current;
      if (owner?.key === key) update(owner, { notice: null });
    },
    retryReport: saveSignal,
    beginProctoredSession,
  };
}

export function ProctoringPreflightModal({
  isOpen,
  onBegin,
  onCancel,
  isStarting = false,
}: {
  isOpen: boolean;
  onBegin: () => void;
  onCancel: () => void;
  isStarting?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!isOpen || !node) return;
    const previous = document.activeElement;
    if (node.showModal) node.showModal();
    else node.setAttribute("open", "");
    return () => {
      if (node.open && node.close) node.close();
      else node.removeAttribute("open");
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <dialog
      ref={dialog}
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-[#DEE8FB] bg-white p-5 text-[#1F285B] backdrop:bg-[#1F285B]/40 sm:p-7"
      aria-labelledby="assessment-ready-title"
      aria-describedby="assessment-ready-policy"
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
          ];
          const first = buttons[0];
          const last = buttons.at(-1);
          if (
            first &&
            last &&
            ((event.shiftKey && document.activeElement === first) ||
              (!event.shiftKey && document.activeElement === last))
          ) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="min-w-0">
        <h2 id="assessment-ready-title" className="text-xl font-semibold">
          Ready for your assessment?
        </h2>
        <ul
          id="assessment-ready-policy"
          className="list-disc space-y-3 pl-5 py-5 text-sm leading-relaxed"
        >
          <li>Answer by voice, using your own understanding.</li>
          <li>Keep this tab open. We will request fullscreen if your browser supports it.</li>
          <li>
            Tab changes and fullscreen exits may be recorded for review. They do not automatically
            end your assessment or prove cheating.
          </li>
          <li>Your timer keeps running during interruptions. Saved answers stay saved.</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 rounded-xl border border-[#344499] px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={onCancel}
          >
            Not yet
          </button>
          <button
            type="button"
            disabled={isStarting}
            className="min-h-11 rounded-xl bg-black px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
            onClick={onBegin}
          >
            {isStarting ? "Opening assessment…" : "Begin assessment"}
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
        This browser interruption does not automatically end your assessment. Check the session
        timer and current question before continuing; saved answers are not removed by this signal.
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
          <button type="button" className="min-h-11 underline" onClick={onRetry}>
            Retry recording interruption
          </button>
        )}
        <button type="button" className="min-h-11 font-semibold underline" onClick={onContinue}>
          Continue answering
        </button>
      </div>
    </section>
  );
}
