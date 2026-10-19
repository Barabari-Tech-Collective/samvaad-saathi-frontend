"use client";

import SubmissionReceipt from "@/components/interview/SubmissionReceipt";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS, ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import {
  trackReportGenerationError,
  trackReportGenerationStart,
} from "@/lib/posthog/tracking.utils";
import { CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function InterviewCompleted() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const interviewId = searchParams.get("interviewId");
  const role = searchParams.get("role") || "practice";
  const startedRef = useRef(false);
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const {
    mutateAsync: generateReport,
    isPending,
    isError,
  } = apiClient.useMutation<unknown, { interviewId: number }>({
    url: ENDPOINTS_V2.SUMMARY_REPORT,
    method: "post",
    showToastError: false,
    options: {
      onSuccess: () => router.replace(`/report-summary?interviewId=${interviewId}`),
      onError: (error) => trackReportGenerationError(error.message || "Unknown report error"),
    },
    keyToInvalidate: {
      queryKey: [ENDPOINTS.INTERVIEWS.LIST, ENDPOINTS.INTERVIEWS.WITH_SUMMARY],
    },
  });

  const prepareReport = useCallback(async () => {
    const parsedId = Number(interviewId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      toast.error("This interview could not be identified. Open it again from History.");
      return;
    }
    trackReportGenerationStart();
    try {
      await generateReport({ interviewId: parsedId });
    } catch {
      // The mutation owns error tracking; the screen keeps an explicit recovery action available.
    }
  }, [generateReport, interviewId]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void prepareReport();
  }, [prepareReport]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center py-10">
      <section
        className="w-full rounded-3xl border border-[#D6E0FB] bg-white p-6 text-center shadow-[0_18px_50px_rgba(31,40,91,0.08)] sm:p-10"
        aria-live="polite"
      >
        <CheckCircleIcon className="mx-auto size-14 text-emerald-600" aria-hidden="true" />
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-[#344499]">
          Interview saved
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Your {role} interview is saved
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-600">
          Your answers are already saved. You can leave this page safely while we prepare
          evidence-based feedback.
        </p>

        <div className="mt-6">
          <SubmissionReceipt interviewId={interviewId} />
        </div>
        <div className="mx-auto mt-7 max-w-md rounded-2xl bg-[#F9FAFB] p-5 text-left">
          <div className="flex items-start gap-3">
            <ClockIcon
              className={`mt-0.5 size-6 shrink-0 text-[#344499] ${isPending ? "animate-pulse" : ""}`}
              aria-hidden="true"
            />
            <div>
              <h2 className="font-bold">
                {isError ? "Feedback is delayed" : "Checking transcripts and evidence"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {isError
                  ? "Nothing was lost. You can retry now or check History later."
                  : "We validate each answer before showing a score. Missing evidence will be labelled instead of guessed."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {isError && (
            <button
              type="button"
              onClick={() => void prepareReport()}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FFCC33] px-6 font-bold text-[#1F285B]"
            >
              Retry report
            </button>
          )}
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#1F285B] px-6 font-bold text-[#1F285B]"
            href="/history"
          >
            View history
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D6E0FB] px-6 font-bold text-[#344499]"
            href="/practice"
          >
            Continue practising
          </Link>
        </div>
      </section>
    </main>
  );
}
