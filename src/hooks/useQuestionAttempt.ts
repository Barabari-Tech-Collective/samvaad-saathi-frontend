"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StartAttempt = (input: {
  interviewId: number;
  questionId: number;
}) => Promise<{ questionAttemptId: number }>;

export function useQuestionAttempt(
  interviewId: number,
  questionId: number | undefined,
  startAttempt: StartAttempt
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
      const result = await request.current({ interviewId, questionId });
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
    void retry();
    return () => {
      version.current++;
    };
  }, [retry]);

  return {
    id: state.key === key ? state.id : undefined,
    pending: state.key !== key || state.pending,
    failed: state.key === key && state.failed,
    retry,
  };
}
