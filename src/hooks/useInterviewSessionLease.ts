"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { courseAccessMessage } from "@/lib/interview-course-access";
import { getSessionLeaseErrorCode } from "@/lib/interview-session-lease";
import type { InterviewSessionLeaseResponse } from "@/app/(protected)/interview/types";

const HEARTBEAT_INTERVAL_MS = 30_000;

type LeaseStatus = "idle" | "acquiring" | "active" | "reconnecting" | "conflict" | "error";

type LockManagerLike = {
  request<T>(
    name: string,
    options: { ifAvailable: true },
    callback: (lock: unknown | null) => Promise<T>
  ): Promise<T>;
};

function storageKey(interviewId: number) {
  return `samvaad:interview-lease:${interviewId}`;
}

function readToken(interviewId: number): string | null {
  try {
    return window.sessionStorage.getItem(storageKey(interviewId));
  } catch {
    return null;
  }
}

function writeToken(interviewId: number, token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(storageKey(interviewId), token);
    else window.sessionStorage.removeItem(storageKey(interviewId));
  } catch {
    // The in-memory token still keeps the current page safe when storage is blocked.
  }
}

export function useInterviewSessionLease({
  interviewId,
  enabled,
}: {
  interviewId: number | null;
  enabled: boolean;
}) {
  const api = createApiClient(APIService.INTERVIEWS);
  const { mutateAsync: claimSession } = api.useMutation<
    InterviewSessionLeaseResponse,
    { interviewId: number; leaseToken?: string; force: boolean }
  >({ url: ENDPOINTS.INTERVIEWS.CLAIM_SESSION, method: "post" });
  const { mutateAsync: heartbeatSession } = api.useMutation<
    InterviewSessionLeaseResponse,
    { interviewId: number; leaseToken: string }
  >({ url: ENDPOINTS.INTERVIEWS.HEARTBEAT_SESSION, method: "post" });

  const [status, setStatus] = useState<LeaseStatus>(enabled ? "acquiring" : "idle");
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const operationVersion = useRef(0);
  const interviewRef = useRef(interviewId);
  const enabledRef = useRef(enabled);
  const mounted = useRef(true);
  const releaseBrowserLock = useRef<(() => void) | null>(null);
  const claimRef = useRef(claimSession);
  const heartbeatRef = useRef(heartbeatSession);
  claimRef.current = claimSession;
  heartbeatRef.current = heartbeatSession;
  interviewRef.current = interviewId;
  enabledRef.current = enabled;

  const activate = useCallback(
    (nextToken: string) => {
      if (
        !interviewId ||
        !mounted.current ||
        !enabledRef.current ||
        interviewRef.current !== interviewId
      )
        return;
      tokenRef.current = nextToken;
      setToken(nextToken);
      writeToken(interviewId, nextToken);
      setAccessMessage(null);
      setStatus("active");
    },
    [interviewId]
  );

  const markConflict = useCallback(() => {
    if (!mounted.current) return;
    operationVersion.current++;
    setStatus("conflict");
  }, []);

  const claim = useCallback(
    async (force: boolean) => {
      if (!interviewId) return;
      const operation = ++operationVersion.current;
      setStatus("acquiring");
      try {
        const existing = tokenRef.current ?? readToken(interviewId);
        const result = await claimRef.current({
          interviewId,
          ...(existing ? { leaseToken: existing } : {}),
          force,
        });
        if (operation === operationVersion.current) activate(result.leaseToken);
      } catch (error) {
        if (
          operation !== operationVersion.current ||
          !mounted.current ||
          !enabledRef.current ||
          interviewRef.current !== interviewId
        )
          return;
        const access = courseAccessMessage(error);
        if (access) {
          setAccessMessage(access);
          setStatus("error");
          return;
        }
        const code = getSessionLeaseErrorCode(error);
        if (code === "SESSION_ACTIVE_ELSEWHERE" || code === "SESSION_LEASE_REPLACED") {
          setStatus("conflict");
        } else if (!(error as { response?: unknown })?.response) {
          setStatus("reconnecting");
        } else {
          setStatus("error");
        }
      }
    },
    [activate, interviewId]
  );

  useEffect(() => {
    mounted.current = true;
    if (!enabled || !interviewId) {
      operationVersion.current++;
      tokenRef.current = null;
      setToken(null);
      setAccessMessage(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const locks = (navigator as Navigator & { locks?: LockManagerLike }).locks;
    if (!locks) {
      void claim(false);
      return () => {
        cancelled = true;
      };
    }

    void locks
      .request(`samvaad:interview:${interviewId}`, { ifAvailable: true }, async (lock) => {
        if (cancelled) return;
        if (!lock) {
          setStatus("conflict");
          return;
        }
        await claim(false);
        await new Promise<void>((resolve) => {
          releaseBrowserLock.current = resolve;
        });
      })
      .catch(() => {
        if (!cancelled && mounted.current) setStatus("error");
      });

    return () => {
      cancelled = true;
      releaseBrowserLock.current?.();
      releaseBrowserLock.current = null;
    };
  }, [claim, enabled, interviewId]);

  useEffect(() => {
    if (!enabled || !interviewId || status !== "active" || !token) return;
    let stopped = false;
    const heartbeat = async () => {
      const operation = operationVersion.current;
      try {
        const result = await heartbeatRef.current({ interviewId, leaseToken: token });
        if (!stopped && operation === operationVersion.current && tokenRef.current === token)
          activate(result.leaseToken);
      } catch (error) {
        if (stopped || operation !== operationVersion.current || tokenRef.current !== token) return;
        const access = courseAccessMessage(error);
        if (access) {
          setAccessMessage(access);
          setStatus("error");
          return;
        }
        const code = getSessionLeaseErrorCode(error);
        if (code === "SESSION_LEASE_REPLACED" || code === "SESSION_ACTIVE_ELSEWHERE") {
          markConflict();
        } else {
          setStatus("reconnecting");
        }
      }
    };
    const interval = window.setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void heartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activate, enabled, interviewId, markConflict, status, token]);

  useEffect(() => {
    if (!enabled || status !== "reconnecting") return;
    const timeout = window.setTimeout(() => void claim(false), 5_000);
    return () => window.clearTimeout(timeout);
  }, [claim, enabled, status]);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  const takeOver = useCallback(async () => {
    await claim(true);
  }, [claim]);

  const retry = useCallback(async () => {
    await claim(false);
  }, [claim]);

  const clear = useCallback(() => {
    operationVersion.current++;
    if (interviewId) writeToken(interviewId, null);
    tokenRef.current = null;
    setToken(null);
    setStatus("idle");
    releaseBrowserLock.current?.();
    releaseBrowserLock.current = null;
  }, [interviewId]);

  return {
    accessMessage,
    status,
    token,
    canWrite: !enabled || (status === "active" && Boolean(token)),
    takeOver,
    retry,
    clear,
    markConflict,
  };
}
