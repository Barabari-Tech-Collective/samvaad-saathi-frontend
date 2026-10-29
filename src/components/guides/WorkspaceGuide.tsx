"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * A guided tour, not a pop-up of text.
 *
 * - `target` is a CSS selector for the thing to point at; it is spotlighted and stays clickable.
 * - `href` is the page the step lives on; the tour opens it for the person.
 * - `optional` steps are skipped when their target is not on screen (a role without that page).
 * Preferences are account/workspace/role/version scoped and never grant authorization.
 */
export type GuideStep = {
  title: string;
  body: string;
  target?: string;
  href?: string;
  optional?: boolean;
};

const seen = new Set<string>();
const changed = "samvaad-guide-preference";
const FIND_TIMEOUT_MS = 4000;

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

function readRun(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(`${key}:run`);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

function writeRun(key: string, value: number | null) {
  try {
    if (value === null) sessionStorage.removeItem(`${key}:run`);
    else sessionStorage.setItem(`${key}:run`, String(value));
  } catch {
    /* A tour still works within one page view without storage. */
  }
}

function findTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  try {
    const candidate = document.querySelector(selector);
    if (candidate instanceof HTMLElement && candidate.getClientRects().length) return candidate;
  } catch {
    /* An invalid selector just means there is nothing to point at. */
  }
  return null;
}

type Box = { top: number; left: number; width: number; height: number };

function toBox(element: HTMLElement): Box {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

/** Preferences are account/workspace/role/version scoped, never authorization. */
export function WorkspaceGuide(props: {
  storageKey: string;
  steps: GuideStep[];
  /** Offer the tour on this page. A tour that is already running always continues. */
  offerHere?: boolean;
}) {
  // Account/permission/content changes close the old session.
  return <GuideSession key={JSON.stringify([props.storageKey, props.steps])} {...props} />;
}

function GuideSession({
  storageKey,
  steps,
  offerHere = true,
}: {
  storageKey: string;
  steps: GuideStep[];
  offerHere?: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [run, setRun] = useState<number | null>(null);
  const [invited, setInvited] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [searching, setSearching] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const step = run === null ? undefined : steps[run];

  // Resume a tour that was running before a full page load.
  useEffect(() => {
    const resumed = readRun(storageKey);
    if (resumed !== null && resumed < steps.length) setRun(resumed);
  }, [storageKey, steps.length]);

  const remember = useCallback(
    (outcome: "completed" | "skipped") => {
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
    },
    [storageKey]
  );

  const stop = useCallback(
    (outcome: "completed" | "skipped") => {
      remember(outcome);
      writeRun(storageKey, null);
      setRun(null);
      setBox(null);
      requestAnimationFrame(() => trigger.current?.focus());
    },
    [remember, storageKey]
  );

  const goTo = useCallback(
    (next: number) => {
      writeRun(storageKey, next);
      setRun(next);
    },
    [storageKey]
  );

  // Skip optional steps whose page link is not available to this person.
  const nextIndex = useCallback(
    (from: number, direction: 1 | -1) => {
      let i = from + direction;
      while (i >= 0 && i < steps.length) {
        const s = steps[i];
        if (!(s.optional && s.target && !findTarget(s.target))) return i;
        i += direction;
      }
      return -1;
    },
    [steps]
  );

  const begin = useCallback(() => {
    if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
    setInvited(false);
    const firstStep = steps[0];
    const first =
      firstStep?.optional && firstStep.target && !findTarget(firstStep.target)
        ? nextIndex(0, 1)
        : 0;
    if (first >= 0) goTo(first);
  }, [goTo, nextIndex, steps]);

  // First-visit invitation: quiet, never takes focus, never over active work.
  useEffect(() => {
    if (!offerHere || run !== null || remembered(storageKey)) return;
    const timer = window.setTimeout(() => {
      if (!remembered(storageKey)) setInvited(true);
    }, 700);
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
    };
  }, [offerHere, run, storageKey]);

  // Take the person to the page for this step, then find what to point at.
  useEffect(() => {
    if (!step) return;
    if (step.href && path !== step.href) router.push(step.href);
  }, [step, path, router]);

  // A page the person is not allowed to open sends them elsewhere. Rather than stall, move on.
  useEffect(() => {
    if (run === null || !step?.href || path === step.href) return;
    const timer = window.setTimeout(() => {
      const next = nextIndex(run, 1);
      if (next === -1) stop("completed");
      else goTo(next);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [run, step, path, nextIndex, goTo, stop]);

  useEffect(() => {
    if (!step) return;
    if (step.href && path !== step.href) {
      setBox(null);
      setSearching(true);
      return;
    }
    let cancelled = false;
    let frame = 0;
    let element: HTMLElement | null = null;
    const started = Date.now();
    const measure = () => {
      if (cancelled) return;
      if (element?.isConnected) setBox(toBox(element));
      frame = requestAnimationFrame(measure);
    };
    const look = window.setInterval(() => {
      element = findTarget(step.target);
      if (element) {
        window.clearInterval(look);
        element.scrollIntoView?.({ block: "center", behavior: "smooth" });
        setSearching(false);
        measure();
      } else if (!step.target || Date.now() - started > FIND_TIMEOUT_MS) {
        window.clearInterval(look);
        setBox(null);
        setSearching(false);
      }
    }, 120);
    setSearching(Boolean(step.target));
    return () => {
      cancelled = true;
      window.clearInterval(look);
      cancelAnimationFrame(frame);
    };
  }, [step, path]);

  useEffect(() => {
    if (!step) return;
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (run === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop("skipped");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [run, stop]);

  if (!steps.length) return null;

  const total = steps.length;
  const isLast = run !== null && nextIndex(run, 1) === -1;
  const hasPrevious = run !== null && nextIndex(run, -1) !== -1;
  const pad = 8;
  const spot = box
    ? {
        top: box.top - pad,
        left: box.left - pad,
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      }
    : null;

  // Put the card beside the target when there is room, otherwise below or centred.
  const cardStyle = (() => {
    if (typeof window === "undefined" || !spot || window.innerWidth < 640) return undefined;
    const width = 340;
    const gap = 16;
    const rightRoom = window.innerWidth - (spot.left + spot.width) - gap;
    const beside = rightRoom >= width;
    const left = beside
      ? spot.left + spot.width + gap
      : Math.max(16, Math.min(spot.left, window.innerWidth - width - 16));
    const top = Math.min(
      beside ? Math.max(16, spot.top) : spot.top + spot.height + gap,
      window.innerHeight - 260
    );
    return { top, left, width } as const;
  })();

  return (
    <>
      {run === null && offerHere && (
        <button ref={trigger} type="button" onClick={begin} className="workspace-guide-trigger">
          Quick guide
        </button>
      )}
      {run === null && invited && (
        <aside aria-label="Getting started" className="workspace-guide-invite">
          <span className="workspace-guide-eyebrow">New here?</span>
          <h2>Take a one-minute tour.</h2>
          <p>We will open each page for you and show what it is for.</p>
          <div className="workspace-guide-actions">
            <button type="button" onClick={() => stop("skipped")}>
              Not now
            </button>
            <button type="button" className="workspace-guide-next" onClick={begin}>
              Start guide
            </button>
          </div>
        </aside>
      )}
      {step && run !== null && (
        <div className="workspace-tour" data-state={searching ? "searching" : "ready"}>
          {spot ? (
            <div aria-hidden="true" className="workspace-tour-spot" style={spot} />
          ) : (
            <div aria-hidden="true" className="workspace-tour-dim" />
          )}
          <div
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className={`workspace-tour-card${cardStyle ? "" : " is-centered"}`}
            style={cardStyle}
          >
            <p className="workspace-guide-progress" aria-live="polite">
              Step {Math.min(run + 1, total)} of {total}
            </p>
            <div className="workspace-tour-bar" role="presentation" aria-hidden="true">
              <span style={{ width: `${((run + 1) / total) * 100}%` }} />
            </div>
            <h2 ref={heading} tabIndex={-1} id={titleId}>
              {step.title}
            </h2>
            <p id={bodyId}>{step.body}</p>
            <div className="workspace-guide-actions">
              <button type="button" onClick={() => stop("skipped")}>
                Skip guide
              </button>
              {hasPrevious && (
                <button type="button" onClick={() => goTo(nextIndex(run, -1))}>
                  Back
                </button>
              )}
              <button
                type="button"
                className="workspace-guide-next"
                onClick={() => {
                  const next = nextIndex(run, 1);
                  if (next === -1) stop("completed");
                  else goTo(next);
                }}
              >
                {isLast ? "Got it" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
