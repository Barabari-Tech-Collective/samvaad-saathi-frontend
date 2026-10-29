import { render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
const f = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock("posthog-js", () => ({ default: f }));
vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));
afterEach(() => vi.unstubAllEnvs());
it("disables replay and automatic content/exception capture at initialization", () => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "synthetic");
  render(
    <AnalyticsProvider>
      <p>Private interview content</p>
    </AnalyticsProvider>
  );
  expect(f.init).toHaveBeenCalledWith(
    "synthetic",
    expect.objectContaining({
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      disable_session_recording: true,
      disable_surveys: true,
    })
  );
});
