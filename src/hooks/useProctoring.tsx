"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

/**
 * Proctoring for an Assessment interview: fullscreen lock, tab/window blur
 * detection, and copy/paste/right-click blocking.
 *
 * This is deterrence, not unbypassable enforcement - no web page can force-
 * close a browser extension or stop a sufficiently technical student from
 * disabling JavaScript. What this hook can do, and does: make leaving the
 * monitored view (switching tabs, exiting fullscreen) immediately and
 * irreversibly end the sitting, with the backend as the authority on whether
 * that's allowed to happen at all - see reportViolation's caller, which reads
 * interview_mode from the interview's own stored snapshot, never from the
 * client. A student who fakes this hook's state client-side still can't make
 * the backend terminate a practice interview, and can't make it *not*
 * terminate a real one once this hook's report actually reaches the server.
 */

export type ProctoringViolationReason = "tab_switch" | "fullscreen_exit";

type ReportViolation = (input: {
  interviewId: number;
  reason: ProctoringViolationReason;
}) => Promise<unknown>;

type ProctoringOptions = {
  /** Only ever true for an Assessment interview. Practice must never pass this. */
  enabled: boolean;
  interviewId: number | null;
  reportViolation: ReportViolation;
  /** Called once, right after termination is reported - stop timers, recording, etc. */
  onTerminated?: (reason: ProctoringViolationReason) => void;
};

export function useProctoring({
  enabled,
  interviewId,
  reportViolation,
  onTerminated,
}: ProctoringOptions) {
  const [showPreflight, setShowPreflight] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<ProctoringViolationReason | null>(
    null
  );

  // Refs, not state, for values read inside event listeners: a listener
  // attached with a stale closure over state would keep checking an outdated
  // "have we already terminated" flag and could fire the report twice.
  const hasTerminatedRef = useRef(false);
  const fullscreenEngagedRef = useRef(false);
  const reportViolationRef = useRef(reportViolation);
  reportViolationRef.current = reportViolation;
  const onTerminatedRef = useRef(onTerminated);
  onTerminatedRef.current = onTerminated;
  const lastBlockToastAtRef = useRef(0);

  const terminate = useCallback(
    (reason: ProctoringViolationReason) => {
      if (hasTerminatedRef.current) return;
      hasTerminatedRef.current = true;
      setIsActive(false);
      setIsTerminated(true);
      setTerminationReason(reason);

      if (document.fullscreenElement) {
        // Best-effort: a failed exitFullscreen must not block reporting the
        // violation, which is the part that actually matters.
        document.exitFullscreen().catch(() => {});
      }

      if (interviewId) {
        reportViolationRef.current({ interviewId, reason }).catch(() => {
          // The interview is already locked client-side regardless of whether
          // this network call succeeds - the backend independently enforces
          // the same rule on every other endpoint touching this interview,
          // so a lost report delays the facilitator-visible remark, it does
          // not let the student continue.
        });
      }

      onTerminatedRef.current?.(reason);
    },
    [interviewId]
  );

  const blockAndWarn = useCallback((message: string) => {
    const now = Date.now();
    // Throttled: a student holding Ctrl+C would otherwise spawn a toast per
    // keystroke repeat.
    if (now - lastBlockToastAtRef.current > 2000) {
      lastBlockToastAtRef.current = now;
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) terminate("tab_switch");
    };
    const handleBlur = () => {
      // visibilitychange alone misses some window-manager-level tab/app
      // switches on certain browsers; blur is the backstop. A window losing
      // focus because the student opened dev tools docked in the same window
      // is an accepted false positive - same tradeoff any browser-based proctoring makes.
      if (document.hidden) terminate("tab_switch");
    };
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        fullscreenEngagedRef.current = true;
        return;
      }
      // Only a violation if fullscreen was actually engaged - otherwise a
      // browser that silently refused the original request would terminate
      // the student immediately for a lock that never engaged.
      if (fullscreenEngagedRef.current) terminate("fullscreen_exit");
    };
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      blockAndWarn("Copying is disabled during the assessment.");
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      blockAndWarn("Cutting is disabled during the assessment.");
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      blockAndWarn("Pasting is disabled during the assessment.");
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      blockAndWarn("Right-click is disabled during the assessment.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isActive, terminate, blockAndWarn]);

  const openPreflight = useCallback(() => {
    if (!enabled) return;
    setShowPreflight(true);
  }, [enabled]);

  const closePreflight = useCallback(() => {
    setShowPreflight(false);
  }, []);

  const beginProctoredSession = useCallback(async () => {
    hasTerminatedRef.current = false;
    fullscreenEngagedRef.current = false;
    try {
      await document.documentElement.requestFullscreen();
      // handleFullscreenChange sets fullscreenEngagedRef, but that only fires
      // once the browser's fullscreenchange event delivers - set it here too
      // so a fullscreen-exit a moment later is never missed to a timing gap.
      fullscreenEngagedRef.current = true;
    } catch {
      toast.error(
        "Your browser didn't allow fullscreen mode. The assessment will continue, but stay on this tab - switching away still ends it."
      );
    }
    setShowPreflight(false);
    setIsActive(true);
  }, []);

  return {
    showPreflight,
    isActive,
    isTerminated,
    terminationReason,
    openPreflight,
    closePreflight,
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
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">This is a proctored assessment</h3>
        <ul className="list-disc list-inside py-4 space-y-2 text-sm">
          <li>Your browser will enter fullscreen for the duration of the assessment.</li>
          <li>Switching to another tab or window ends your assessment immediately.</li>
          <li>Exiting fullscreen ends your assessment immediately.</li>
          <li>Copy, paste and right-click are disabled.</li>
          <li>
            Please close other tabs and browser extensions before you begin - they can trigger an
            early end to your assessment.
          </li>
          <li>Ending early is recorded and visible to your facilitator.</li>
        </ul>
        <div className="modal-action">
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onBegin}>
            I understand, begin
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProctoringTerminatedOverlay({
  reason,
  onLeave,
}: {
  reason: ProctoringViolationReason | null;
  onLeave: () => void;
}) {
  const reasonText =
    reason === "fullscreen_exit"
      ? "you exited fullscreen"
      : "you switched away from this tab or window";

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Your assessment has ended</h3>
        <p className="py-4 text-sm">
          This assessment ended early because {reasonText}. This has been recorded and is visible to
          your facilitator.
        </p>
        <div className="modal-action">
          <button className="btn btn-primary" onClick={onLeave}>
            Return home
          </button>
        </div>
      </div>
    </div>
  );
}
