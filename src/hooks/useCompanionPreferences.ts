"use client";

import { useMemo, useSyncExternalStore } from "react";

export interface CompanionPreferences {
  hidden: boolean;
  motion: boolean;
  muted: boolean;
}
export interface CompanionSnapshot extends CompanionPreferences {
  ready: boolean;
}
const DEFAULTS: CompanionSnapshot = { hidden: false, motion: true, muted: false, ready: true };
const SERVER: CompanionSnapshot = { ...DEFAULTS, ready: false };
const CHANGE_EVENT = "samvaad-companion-preferences";

function parse(raw: string | null): CompanionSnapshot {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (typeof value !== "object" || value === null || Array.isArray(value)) return DEFAULTS;
    const data = value as Record<string, unknown>;
    if (
      data.version !== 1 ||
      Object.keys(data).length !== 4 ||
      typeof data.hidden !== "boolean" ||
      typeof data.motion !== "boolean" ||
      typeof data.muted !== "boolean"
    )
      return DEFAULTS;
    return { hidden: data.hidden, motion: data.motion, muted: data.muted, ready: true };
  } catch {
    return DEFAULTS;
  }
}

/** Account-scoped presentation only. No answers, tokens or interview policy are stored. */
function preferenceStore(scope: string | null) {
  const key = scope === null ? null : `samvaad-companion:v1:${encodeURIComponent(scope)}`;
  let raw: string | null | undefined;
  let snapshot = DEFAULTS;
  let memoryOverride = false;
  function getSnapshot(): CompanionSnapshot {
    if (!key || typeof window === "undefined") return SERVER;
    try {
      const current = window.localStorage.getItem(key);
      if (current !== raw) {
        raw = current;
        memoryOverride = false;
        snapshot = parse(current);
      } else if (!memoryOverride && raw === undefined) snapshot = DEFAULTS;
    } catch {
      /* Keep current-view choices when optional storage is unavailable. */
    }
    return snapshot;
  }
  function subscribe(notify: () => void) {
    const storage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        raw = undefined;
        memoryOverride = false;
        notify();
      }
    };
    window.addEventListener("storage", storage);
    window.addEventListener(CHANGE_EVENT, notify);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener(CHANGE_EVENT, notify);
    };
  }
  function update(patch: Partial<CompanionPreferences>) {
    if (!key) return;
    const current = getSnapshot();
    const next = { ...current, ...patch, ready: true };
    const value = JSON.stringify({
      version: 1,
      hidden: next.hidden,
      motion: next.motion,
      muted: next.muted,
    });
    try {
      window.localStorage.setItem(key, value);
      raw = value;
      memoryOverride = false;
    } catch {
      memoryOverride = true;
    }
    snapshot = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return { getSnapshot, subscribe, update };
}

export function useCompanionPreferences(scope: string | null) {
  const store = useMemo(() => preferenceStore(scope), [scope]);
  const preferences = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER);
  return { preferences, update: store.update };
}
