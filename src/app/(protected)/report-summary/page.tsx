"use client";

import { useAuth } from "@/components/providers/auth-provider";
import ReportRecovery from "@/components/interview/ReportRecovery";
import { responseStatus, validInterviewId } from "@/lib/interview-history";
import SubmissionReceipt from "@/components/interview/SubmissionReceipt";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { hasReportEnvelope, reportStatusCopy, safeDrillHref } from "@/lib/practice-report";
import { trackButtonClick } from "@/lib/posthog/tracking.utils";
import { formatDate } from "@/lib/utils";
import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
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
  const { user, loading } = useAuth();
  if (!validInterviewId(interviewId)) return <ReportRecovery kind="invalid" />;
  if (loading || !user?.userId) return <ReportRecovery kind="checking" />;
  return (
    <ReportContent
      key={`${user.userId}:${interviewId}`}
      account={String(user.userId)}
      interviewId={interviewId}
    />
  );
}

function ReportContent({ account, interviewId }: { account: string; interviewId: string }) {
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);
  const { data, isLoading, error, refetch, isFetching } = apiClient.useQuery<ReportResponse>({
    key: ["practice-report", account, interviewId],
    url: `${ENDPOINTS_V2.SUMMARY_REPORT}/${interviewId || ""}`,
    enabled: Boolean(interviewId),
    options: { retry: false, staleTime: 0, gcTime: 0 },
  });

  const { data: attemptMeta } = apiClient.useQuery<{ interviewMode: "practice" | "assessment" }>({
    key: ["submission-receipt", account, interviewId],
    url: `interviews/${interviewId}/receipt`,
    enabled: Boolean(interviewId),
    options: { staleTime: 0, gcTime: 0, retry: false },
  });

  if (isLoading && !data) return <SkeletonLoader />;
  if (isFetching) return <ReportRecovery kind="checking" />;
  if (error || !data) {
    const code = responseStatus(error);
    const kind = code === 404 ? "missing" : code === 401 || code === 403 ? "denied" : "unavailable";
    return <ReportRecovery kind={kind} interviewId={interviewId} onRetry={() => void refetch()} />;
  }
  if (!hasReportEnvelope(data)) {
    return (
      <ReportRecovery kind="malformed" interviewId={interviewId} onRetry={() => void refetch()} />
    );
  }

  const recommendation = data.recommendedPractice;
  const status = data.reportStatus ?? "ready";

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-7 [overflow-wrap:anywhere] pb-12 pt-4 text-[#111827] sm:pt-7">
      <header className="rounded-3xl bg-[#1F285B] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FFCC33]">
            {attemptMeta?.interviewMode === "assessment"
              ? "Assessment feedback"
              : attemptMeta?.interviewMode === "practice"
                ? "Practice coaching"
                : "Interview feedback"}
          </p>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
            {reportStatusCopy(status)}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Your {data.candidateInfo.roleTopic} report
        </h1>
        <p className="mt-3 text-blue-100">
          Interview date {formatDate(data.candidateInfo.interviewDate)}
          {data.candidateInfo.duration ? ` · ${data.candidateInfo.duration}` : ""}
        </p>
      </header>
      <SubmissionReceipt interviewId={interviewId} />

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
            An overall score is not available from this report’s current evidence. Missing or
            unclear speech is not treated as a low score.
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
    </div>
  );
}
