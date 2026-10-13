"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StartAttempt = (input: {
  interviewId: number;
  questionId: number;
  clientAttemptId: string;
}) => Promise<{ questionAttemptId: number }>;

function clientAttemptId(interviewId: number, questionId: number): string {
  const storageKey = `samvaad:attempt:${interviewId}:${questionId}`;
  try {
    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem(storageKey);
      if (existing) return existing;
    }
  } catch {
    // Storage can be blocked by private browsing or embedded webviews. The
    // request still gets a stable id for this mounted question and the server
    // remains safe; only cross-reload reuse is unavailable.
  }
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const value = `practice-${interviewId}-${questionId}-${random}`.slice(0, 64);
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, value);
  } catch {
    /* see blocked-storage note above */
  }
  return value;
}

export function useQuestionAttempt(
  interviewId: number,
  questionId: number | undefined,
  startAttempt: StartAttempt,
  initialAttemptId?: number | null
) {
  const [state, setState] = useState<{
    key: string;
    id?: number;
    pending: boolean;
    failed: boolean;
  }>({ key: "", pending: false, failed: false });
  const version = useRef(0);
  const request = useRef(startAttempt);
  request.current = startAttempt;
  const key = `${interviewId}:${questionId}`;
  const clientIdRef = useRef({ key: "", value: "" });
  if (questionId && clientIdRef.current.key !== key) {
    clientIdRef.current = { key, value: clientAttemptId(interviewId, questionId) };
  }
  const activeKey = useRef(key);
  activeKey.current = key;

  const retry = useCallback(async () => {
    // No question yet means the question list is still loading, so staying pending
    // is correct. An unusable interview id never resolves, so it must surface as a
    // failure - reporting "pending" forever leaves the student with no visible
    // error and no retry control.
    if (!questionId) return;
    if (!Number.isSafeInteger(interviewId) || interviewId <= 0) {
      setState({ key, pending: false, failed: true });
      return;
    }
    const sequence = ++version.current;
    setState({ key, pending: true, failed: false });
    try {
      const result = await request.current({
        interviewId,
        questionId,
        clientAttemptId: clientIdRef.current.value,
      });
      if (!Number.isSafeInteger(result.questionAttemptId) || result.questionAttemptId <= 0)
        throw new Error("INVALID_ATTEMPT");
      if (sequence === version.current && key === activeKey.current)
        setState({ key, id: result.questionAttemptId, pending: false, failed: false });
    } catch {
      if (sequence === version.current && key === activeKey.current)
        setState({ key, pending: false, failed: true });
    }
  }, [interviewId, questionId, key]);

  useEffect(() => {
    if (initialAttemptId && Number.isSafeInteger(initialAttemptId) && initialAttemptId > 0) {
      version.current++;
      setState({ key, id: initialAttemptId, pending: false, failed: false });
      return;
    }
    void retry();
    return () => {
      version.current++;
    };
  }, [initialAttemptId, key, retry]);

  return {
    id: state.key === key ? state.id : undefined,
    pending: state.key !== key || state.pending,
    failed: state.key === key && state.failed,
    retry,
  };
}
