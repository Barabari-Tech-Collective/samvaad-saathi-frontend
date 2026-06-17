"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackScreenView } from "@/lib/posthog/tracking.utils";
import { SCREEN_VIEW } from "@/lib/posthog/events";

const PATH_TO_SCREEN_MAP: Record<string, string> = {
  "/home": SCREEN_VIEW.HOME_PAGE,
  "/history": SCREEN_VIEW.HISTORY_PAGE,
  "/practice": SCREEN_VIEW.PRACTICE_LIST_PAGE,
  "/profile": SCREEN_VIEW.PROFILE_PAGE,
  "/onboarding": SCREEN_VIEW.ONBOARDING_PAGE,
  "/interview": SCREEN_VIEW.INTERVIEW_PAGE,
  "/interview-start": SCREEN_VIEW.INTERVIEW_SETUP_PAGE,
  "/interview-completed": SCREEN_VIEW.INTERVIEW_COMPLETED_PAGE,
  "/report-summary": SCREEN_VIEW.OVERALL_REPORT_PAGE,
  "/auth/signup": SCREEN_VIEW.SIGNUP_PAGE,
  "/pronunciation-practice/start": SCREEN_VIEW.PRONUNCIATION_PRACTICE_START_PAGE,
  "/pronunciation-practice": SCREEN_VIEW.PRONUNCIATION_PRACTICE_PAGE,
  "/structure-your-answer/interview": SCREEN_VIEW.STRUCTURE_YOUR_ANSWER_INTERVIEW_PAGE,
  "/structure-your-answer": SCREEN_VIEW.STRUCTURE_YOUR_ANSWER_PAGE,
};

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      // Find the best match for the current path
      const screenName = Object.entries(PATH_TO_SCREEN_MAP).find(([path]) =>
        pathname.startsWith(path)
      )?.[1];

      if (screenName) {
        const interviewId = searchParams.get("interviewId") || undefined;
        trackScreenView(screenName, interviewId);
      }
    }
  }, [pathname, searchParams]);

  return null;
}
