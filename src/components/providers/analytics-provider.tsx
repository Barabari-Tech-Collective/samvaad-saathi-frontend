"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

const isLocalDev = process.env.NODE_ENV === "development";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Both settings are required. A key without a matching host sends every call to the wrong
    // region, fails with 401/404 on each page, and a copied production key would mix test
    // activity into real analytics. Environments without analytics leave both unset.
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
    if (!key || !host) return;

    posthog.init(key, {
      api_host: host,
      defaults: "2025-05-24",
      // Interview content and résumé forms must never enter automatic capture.
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      disable_session_recording: true,
      disable_surveys: true,
      person_profiles: "identified_only",
      opt_out_capturing_by_default: isLocalDev,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
