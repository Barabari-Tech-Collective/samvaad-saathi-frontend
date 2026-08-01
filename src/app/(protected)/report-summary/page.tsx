"use client";
import TaskIcon from "@/components/icons/Task";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";

import { trackButtonClick } from "@/lib/posthog/tracking.utils";
import { formatDate } from "@/lib/utils";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import FinalSummary from "./_components/FinalSummary";
import OverallScoreSummary from "./_components/OverallScoreSummary";
import PerQuestionAnalysis from "./_components/PerQuestionAnalysis";
import SkeletonLoader from "./_components/SkeletonLoader";
import { ReportResponse } from "./_components/types";

type ReportTab = "per-question" | "final-summary";

const getRatingEmoji = (rating: string): string => {
  const ratingMap: Record<string, string> = {
    Excellent: "😄",
    Good: "🙂",
    Average: "🤔",
    "Needs-Improvement": "😕",
    Poor: "😞",
  };
  return ratingMap[rating] || "🤔";
};

const ReportSummaryPage: React.FC = () => {
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("interviewId");
  const [activeTab, setActiveTab] = useState<ReportTab>("per-question");

  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const scrollToSection = (sectionId: string, tab: ReportTab) => {
    trackButtonClick(`report_tab_click_${tab}`, "report_summary_page");
    setActiveTab(tab);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const {
    data: reportData,
    isLoading,
    error,
  } = apiClient.useQuery<ReportResponse>({
    key: ["report", interviewId],
    url: `${ENDPOINTS_V2.SUMMARY_REPORT}/${interviewId || ""}`,
    enabled: !!interviewId,
  });
  console.log("this is the report data", reportData);
  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error || !reportData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-error">Error</h1>
          <p className="text-base-content/70">Failed to load report data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 sm:py-6">
      <h1 className="font-bold mb-0">{reportData?.candidateInfo?.roleTopic} Performance Report</h1>
      <p>Interview Date: {formatDate(reportData?.candidateInfo?.interviewDate)}</p>
      {/* 
      <SummaryOverview
        candidateName={reportData.candidateInfo.name}
        role={reportData.candidateInfo.roleTopic}
        date={reportData.candidateInfo.interviewDate}
        duration={reportData.candidateInfo.duration}
        durationFeedback={reportData.candidateInfo.durationFeedback}
      /> */}

      <OverallScoreSummary
        knowledgeCompetence={reportData?.scoreSummary?.knowledgeCompetence}
        speechAndStructure={reportData?.scoreSummary?.speechAndStructure}
      />

      <div role="tablist" className="tabs tabs-box mb-3 w-full bg-gray-200 p-2 font-bold text-2xl">
        <a
          role="tab"
          className={`tab flex-1 ${
            activeTab === "per-question" ? "tab-active shadow-2xl rounded-xl" : ""
          }`}
          onClick={() => scrollToSection("per-question-analysis", "per-question")}
        >
          Per Question Analysis
        </a>
        <a
          role="tab"
          className={`tab flex-1 ${
            activeTab === "final-summary" ? "tab-active shadow-2xl rounded-xl" : ""
          }`}
          onClick={() => scrollToSection("final-summary", "final-summary")}
        >
          Speech Summary
        </a>
      </div>

      <PerQuestionAnalysis questionAnalysis={reportData?.questionAnalysis} />

      <div className="card bg-base-100 rounded-xl shadow-md">
        <div className="card-body gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center bg-base-100">
                <TaskIcon className="size-7 text-base-content" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base-content text-lg">
                {reportData?.recommendedPractice?.title}
              </h3>
              <p className="text-base-content/70 text-sm">
                {reportData?.recommendedPractice?.description}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href={`/structure-your-answer/interview?interviewId=${interviewId}&role=${reportData?.candidateInfo?.roleTopic}`}
              onClick={() =>
                trackButtonClick("practice_structure_your_answer", "report_summary_page")
              }
            >
              <button className="btn btn-primary  cursor-pointer">
                Practice Now
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <FinalSummary speechFluencyFeedback={reportData?.speechFluencyFeedback} />

      {/* Speaker Analysis Section */}
      <div className="card bg-base-100 rounded-xl shadow-md">
        <div className="card-body flex-row items-center gap-4 p-6">
          <div className="flex-shrink-0">
            <div className="text-5xl">
              {getRatingEmoji(reportData?.speechFluencyFeedback?.ratingEmoji || "")}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base-content text-md mb-2">
              {reportData?.speechFluencyFeedback?.ratingTitle}
            </h3>
            <p className="text-base-content/70">
              {reportData?.speechFluencyFeedback?.ratingDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-base-content mb-2">
            Your Next Steps to Mastering the {reportData?.candidateInfo?.roleTopic || "Role"}
          </h2>
          <div className="border-t-2 border-dotted border-primary"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card bg-base-100 rounded-xl shadow-md">
            <div className="card-body gap-4 p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center bg-base-100">
                    <TaskIcon className="size-7 text-base-content" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base-content">Master Your Pronunciation</h3>
                </div>
              </div>
              <div className="flex justify-end">
                <Link
                  href={`/pronunciation-practice?role=${reportData?.candidateInfo?.roleTopic}&difficulty=medium`}
                  onClick={() => trackButtonClick("practice_pronunciation", "report_summary_page")}
                >
                  <button className="btn btn-primary cursor-pointer">
                    Practice Now
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 rounded-xl shadow-md">
            <div className="card-body gap-4 p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-full border-2 border-primary flex items-center justify-center bg-base-100">
                    <TaskIcon className="size-7 text-base-content" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base-content">
                    Replace Fillers with Silent Pauses
                  </h3>
                </div>
              </div>
              <div className="flex justify-end">
                <Link
                  href={`/structure-your-answer/interview?role=${reportData?.candidateInfo?.roleTopic}`}
                  onClick={() => trackButtonClick("practice_pronunciation", "report_summary_page")}
                >
                  <button className="btn btn-primary cursor-pointer">
                    Practice Now
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Tip Section */}
      <div className="space-y-3">
        <h2 className="font-bold text-base-content text-xl">{reportData?.finalTip?.title}</h2>
        <p className="text-base-content/70">{reportData?.finalTip?.description}</p>
      </div>
    </div>
  );
};

export default ReportSummaryPage;
