"use client";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { AxiosRequestConfig } from "axios";

/** Use inside a view keyed by its account and resource context. */
export function useViewLifetime() {
  const owner = useRef<{ alive: boolean; controller: AbortController } | null>(null);
  useLayoutEffect(() => {
    const value = { alive: true, controller: new AbortController() };
    owner.current = value;
    return () => {
      value.alive = false;
      value.controller.abort();
    };
  }, []);
  const isCurrent = useCallback(() => owner.current?.alive === true, []);
  const requireCurrent = useCallback(() => {
    if (!isCurrent()) throw new DOMException("This interview view has changed.", "AbortError");
  }, [isCurrent]);
  const requestConfig = useMemo<
    AxiosRequestConfig & { _signalGetter: () => AbortSignal | undefined }
  >(() => ({ _signalGetter: () => owner.current?.controller.signal }), []);
  return { isCurrent, requireCurrent, requestConfig };
}
