"use client";

import { useEffect, useId, useRef, useState } from "react";

export type GuideStep = { title: string; body: string; target?: string };
const seen = new Set<string>();
const changed = "samvaad-guide-preference";
export function guideStorageKey(userId: string, workspace: string, role: string, version: number) {
  return `samvaad-guide:${encodeURIComponent(userId)}:${encodeURIComponent(workspace)}:${encodeURIComponent(role)}:v${version}`;
}
function remembered(key: string) {
  if (seen.has(key)) return true;
  try {
    const record: unknown = JSON.parse(localStorage.getItem(key) || "null");
    return (
      typeof record === "object" &&
      record !== null &&
      "outcome" in record &&
      (record.outcome === "completed" || record.outcome === "skipped")
    );
  } catch {
    return false;
  }
}

/** Preferences are account/workspace/role/version scoped, never authorization. */
export function WorkspaceGuide(props: { storageKey: string; steps: GuideStep[] }) {
  // Account/permission/content changes close the old session, including its modal.
  return <GuideSession key={JSON.stringify([props.storageKey, props.steps])} {...props} />;
}
function GuideSession({ storageKey, steps }: { storageKey: string; steps: GuideStep[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const restoreFrame = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [invited, setInvited] = useState(false);
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
      /* Replay still works with storage disabled. */
    }
    setInvited(false);
    window.dispatchEvent(new CustomEvent(changed, { detail: storageKey }));
  };
  const launch = () => {
    // A guide must not stack above another task's modal.
    if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setInvited(false);
    setIndex(0);
    setOpen(true);
  };
  const finish = (outcome: "completed" | "skipped") => {
    remember(outcome);
    setOpen(false);
    const target = previousFocus.current;
    restoreFrame.current = requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
      else trigger.current?.focus();
    });
  };
  useEffect(() => {
    // Invite without stealing focus or interrupting a task already in progress.
    const timer = window.setTimeout(() => setInvited(!remembered(storageKey)), 650);
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== storageKey) return;
      if (event instanceof CustomEvent && event.detail !== storageKey) return;
      if (remembered(storageKey)) setInvited(false);
    };
    window.addEventListener("storage", sync);
    window.addEventListener(changed, sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener(changed, sync);
      if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
    };
  }, [storageKey]);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
    if (!open) return;
    heading.current?.focus();
    if (!step?.target) return;
    let target: HTMLElement | null = null;
    try {
      const candidate = document.querySelector(step.target);
      if (candidate instanceof HTMLElement) target = candidate;
    } catch {
      /* Invalid or removed anchors leave a readable guide card. */
    }
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
        hidden={invited}
      >
        Quick guide
      </button>
      {invited && (
        <aside aria-label="Getting started" className="workspace-guide-invite">
          <span className="workspace-guide-eyebrow">A little help to get started</span>
          <h2>Find your way around.</h2>
          <p>A short guide to this workspace. Start when you’re ready.</p>
          <div className="workspace-guide-actions">
            <button type="button" onClick={() => finish("skipped")}>
              Not now
            </button>
            <button type="button" className="workspace-guide-next" onClick={launch}>
              Start guide
            </button>
          </div>
        </aside>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="workspace-guide-dialog"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === heading.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          finish("skipped");
        }}
      >
        <div className="workspace-guide-content">
          <p className="workspace-guide-progress" aria-live="polite">
            Step {index + 1} of {steps.length}
          </p>
          <h2 ref={heading} tabIndex={-1} id={titleId}>
            {step.title}
          </h2>
          <p id={bodyId}>{step.body}</p>
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
