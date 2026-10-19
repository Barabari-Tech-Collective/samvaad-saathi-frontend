"use client";

import { useEffect, useId, useRef, useState } from "react";

export type GuideStep = { title: string; body: string; target?: string };
const seen = new Set<string>();
export function guideStorageKey(userId: string, workspace: string, role: string, version: number) {
  return `samvaad-guide:${encodeURIComponent(userId)}:${encodeURIComponent(workspace)}:${encodeURIComponent(role)}:v${version}`;
}

/** Local, account/workspace/role/version-scoped help. No evidence or permissions stored here. */
export function WorkspaceGuide({ storageKey, steps }: { storageKey: string; steps: GuideStep[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const step = steps[index];
  const remember = (outcome: "completed" | "skipped") => {
    seen.add(storageKey);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ outcome, recordedAt: new Date().toISOString() })
      );
    } catch {
      /* Help still works with storage disabled. */
    }
  };
  const launch = () => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIndex(0);
    setOpen(true);
  };
  const finish = (outcome: "completed" | "skipped") => {
    remember(outcome);
    setOpen(false);
    const target = previousFocus.current;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
      else trigger.current?.focus();
    });
  };
  useEffect(() => {
    let saved = seen.has(storageKey);
    try {
      const raw = localStorage.getItem(storageKey);
      const record = raw ? JSON.parse(raw) : null;
      saved ||= record?.outcome === "completed" || record?.outcome === "skipped";
    } catch {
      /* Optional persistence. */
    }
    if (saved || !steps.length) return;
    const timer = window.setTimeout(() => {
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [storageKey, steps.length]);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
    if (!open || !step?.target) return;
    // Missing/hidden targets use the same readable card; no stuck tour or forced navigation.
    const target = document.querySelector<HTMLElement>(step.target);
    if (!target || !target.getClientRects().length) return;
    target.setAttribute("data-guide-highlight", "true");
    target.scrollIntoView?.({ block: "nearest", behavior: "instant" });
    return () => target.removeAttribute("data-guide-highlight");
  }, [open, step]);
  if (!steps.length) return null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={launch}
        aria-haspopup="dialog"
        className="workspace-guide-trigger"
      >
        Quick guide
      </button>
      <dialog
        ref={dialog}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onCancel={(event) => {
          event.preventDefault();
          finish("skipped");
        }}
        className="workspace-guide-dialog"
      >
        <div className="workspace-guide-content">
          <p className="workspace-guide-progress" aria-live="polite">
            Step {index + 1} of {steps.length}
          </p>
          <h2 id={titleId}>{step?.title}</h2>
          <p id={bodyId}>{step?.body}</p>
          <div className="workspace-guide-actions">
            <button type="button" onClick={() => finish("skipped")}>
              Skip guide
            </button>
            {index > 0 && (
              <button type="button" onClick={() => setIndex((i) => i - 1)}>
                Back
              </button>
            )}
            <button
              type="button"
              className="workspace-guide-next"
              onClick={() => {
                if (index + 1 === steps.length) finish("completed");
                else setIndex((i) => i + 1);
              }}
            >
              {index + 1 === steps.length ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
