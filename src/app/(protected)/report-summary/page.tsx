"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { reportStatusCopy, safeDrillHref } from "@/lib/practice-report";
import { trackButtonClick } from "@/lib/posthog/tracking.utils";
import { formatDate } from "@/lib/utils";
import { ArrowRightIcon, ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import EvidenceSummary from "./_components/EvidenceSummary";
import FinalSummary from "./_components/FinalSummary";
import OverallScoreSummary from "./_components/OverallScoreSummary";
import PerQuestionAnalysis from "./_components/PerQuestionAnalysis";
import SkeletonLoader from "./_components/SkeletonLoader";
import type { ReportResponse } from "./_components/types";

export default function ReportSummaryPage() {
  const interviewId = useSearchParams().get("interviewId");
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);
  const { data, isLoading, error, refetch, isFetching } = apiClient.useQuery<ReportResponse>({
    key: ["practice-report", interviewId],
    url: `${ENDPOINTS_V2.SUMMARY_REPORT}/${interviewId || ""}`,
    enabled: Boolean(interviewId),
    options: { retry: 1, staleTime: 60_000 },
  });

  if (!interviewId) {
    return (
      <main className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold">We could not identify this interview</h1>
        <p className="mt-3 text-gray-600">Open the report again from your interview history.</p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#FFCC33] px-5 font-bold text-[#1F285B]"
          href="/history"
        >
          Open history
        </Link>
      </main>
    );
  }

  if (isLoading && !data) return <SkeletonLoader />;

  if (error || !data) {
    return (
      <main className="mx-auto max-w-xl py-16 text-center" role="alert">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7">
          <h1 className="text-2xl font-bold text-amber-950">Your report is not ready yet</h1>
          <p className="mt-3 leading-6 text-amber-900">
            Your interview answers remain saved. You can retry now or safely return to History and
            check later.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FFCC33] px-5 font-bold text-[#1F285B] disabled:opacity-60"
            >
              <ArrowPathIcon
                className={`size-5 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Try again
            </button>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#1F285B] px-5 font-bold text-[#1F285B]"
              href="/history"
            >
              Return to history
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const recommendation = data.recommendedPractice;
  const status = data.reportStatus ?? "ready";

  return (
    <main className="mx-auto w-full max-w-5xl space-y-7 pb-12 pt-4 text-[#111827] sm:pt-7">
      <header className="rounded-3xl bg-[#1F285B] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FFCC33]">
            Practice coaching
          </p>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
            {reportStatusCopy(status)}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Your {data.candidateInfo.roleTopic} report
        </h1>
        <p className="mt-3 text-blue-100">
          Interview completed {formatDate(data.candidateInfo.interviewDate)}
          {data.candidateInfo.duration ? ` · ${data.candidateInfo.duration}` : ""}
        </p>
      </header>

      {data.evidenceSummary && <EvidenceSummary evidence={data.evidenceSummary} />}

      {data.uncertaintyNotice && (
        <section
          className="rounded-2xl border border-[#F3D29A] bg-[#FFF5E8] p-5"
          aria-label="How to read this report"
        >
          <h2 className="font-bold text-amber-950">How to read this report</h2>
          <p className="mt-1 leading-6 text-amber-900">{data.uncertaintyNotice}</p>
        </section>
      )}

      {data.scoreSummary ? (
        <OverallScoreSummary
          knowledgeCompetence={data.scoreSummary.knowledgeCompetence}
          speechAndStructure={data.scoreSummary.speechAndStructure}
        />
      ) : (
        <section className="rounded-3xl border border-[#D6E0FB] bg-white p-6" role="status">
          <h2 className="text-xl font-bold">No overall score yet</h2>
          <p className="mt-2 max-w-2xl leading-6 text-gray-600">
            We do not turn missing or unclear speech into a low score. Complete more clear spoken
            answers to unlock an evidence-based summary.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-[#344499] px-4 font-bold text-[#344499]"
            href="/interview-start?mode=practice"
          >
            Start another practice interview
          </Link>
        </section>
      )}

      <PerQuestionAnalysis questionAnalysis={data.questionAnalysis} />

      {recommendation && (
        <section
          className="rounded-3xl bg-[#FFE4BF] p-6 sm:p-8"
          aria-labelledby="next-practice-title"
        >
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="mt-0.5 size-7 shrink-0 text-[#344499]" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-amber-900">
                Your next practice
              </p>
              <h2 id="next-practice-title" className="mt-2 text-2xl font-bold">
                {recommendation.title}
              </h2>
              <p className="mt-2 leading-6 text-gray-700">{recommendation.description}</p>
              {recommendation.reason && (
                <p className="mt-3 text-sm font-semibold text-amber-950">{recommendation.reason}</p>
              )}
              <Link
                href={safeDrillHref(recommendation.href)}
                onClick={() =>
                  trackButtonClick(
                    `report_drill_${recommendation.module ?? "legacy"}`,
                    "report_summary_page"
                  )
                }
                className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#FFCC33] px-6 font-bold text-[#1F285B] transition hover:bg-[#FFB800] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
              >
                Start this drill
                <ArrowRightIcon className="size-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {data.speechFluencyFeedback && (
        <FinalSummary speechFluencyFeedback={data.speechFluencyFeedback} />
      )}

      {data.finalTip && (
        <section className="rounded-2xl bg-[#F9FAFB] p-5">
          <h2 className="font-bold">{data.finalTip.title}</h2>
          <p className="mt-1 leading-6 text-gray-600">{data.finalTip.description}</p>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#1F285B] px-5 font-bold text-[#1F285B]"
          href="/history"
        >
          View interview history
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D6E0FB] px-5 font-bold text-[#344499]"
          href="/practice"
        >
          Back to Practice
        </Link>
      </div>
    </main>
  );
}
