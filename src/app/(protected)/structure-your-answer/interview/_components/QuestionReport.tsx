"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { useEffect } from "react";

interface FrameworkSection {
  name: string;
  status: string;
  answerRecorded: boolean;
  timeSpentSeconds: number;
}

interface FrameworkProgress {
  frameworkName: string;
  sections: FrameworkSection[];
  completionPercentage: number;
  sectionsComplete: number;
  totalSections: number;
  progressMessage: string;
}

interface TimePerSection {
  sectionName: string;
  seconds: number;
}

interface QuestionReportResponse {
  answerId: number;
  practiceId: number;
  questionIndex: number;
  frameworkProgress: FrameworkProgress;
  timePerSection: TimePerSection[];
  keyInsight: string;
  analyzedAt: string;
  llmModel: string;
  llmLatencyMs: number;
}

interface QuestionReportProps {
  practiceId: string;
  questionIndex: number;
  onNextQuestion: () => void;
  isLastQuestion: boolean;
}

const getSectionIcon = (sectionName: string) => {
  const name = sectionName.toLowerCase();
  if (name.includes("context")) {
    return ChatBubbleLeftRightIcon;
  }
  if (name.includes("theory")) {
    return BookOpenIcon;
  }
  if (name.includes("example")) {
    return LightBulbIcon;
  }
  if (name.includes("tradeoff") || name.includes("trade-off")) {
    return ScaleIcon;
  }
  if (name.includes("decision")) {
    return AcademicCapIcon;
  }
  return LightBulbIcon;
};

const formatTime = (seconds: number): string => {
  return `${seconds}s`;
};

const QuestionReport = ({
  practiceId,
  questionIndex,
  onNextQuestion,
  isLastQuestion,
}: QuestionReportProps) => {
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const {
    mutateAsync: analyzePractice,
    data: analysisData,
    isPending: isLoading,
  } = apiClient.useMutation<QuestionReportResponse, Record<string, never>>({
    url: ENDPOINTS_V2.ANALYSE_STRUCTURED_PRACTICE_AUDIO(practiceId, questionIndex),
    method: "post",
  });

  // Trigger analyze on mount (only if not skipped)
  // When skipAutoAnalyze is true, the API was already called by handleAnalyze,
  // but we still need to fetch the results, so we call it anyway
  useEffect(() => {
    if (practiceId && questionIndex !== undefined) {
      analyzePractice({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceId, questionIndex]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6">
        <div className="relative max-w-md w-full">
          {/* Gradient border using wrapper */}
          <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 rounded-2xl p-[2px] shadow-lg">
            <div className="bg-white rounded-xl p-8">
              <div className="text-gray-800 text-xl font-medium text-center">
                Analyzing your practice...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="flex flex-col px-6 py-8">
        <div className="my-8">
          <p className="text-sm text-gray-600">No analysis data available for this question.</p>
        </div>
        <div className="flex justify-end mt-auto pt-6">
          <button onClick={onNextQuestion} className="btn btn-primary">
            {isLastQuestion ? "Finish Practice" : "Next Question"}
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  const { frameworkProgress, timePerSection, keyInsight } = analysisData;

  return (
    <div className="flex flex-col px-6 py-8 min-h-screen ">
      {/* Overall Progress Section */}
      <div className="mb-6 bg-white rounded-lg p-6 shadow-sm relative">
        {/* Header with title and circular progress */}
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">Overall Progress</h2>
          {/* Circular Progress Indicator */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="transform -rotate-90" width="64" height="64" viewBox="0 0 64 64">
              {/* Background circle */}
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              {/* Progress circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="#22c55e"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${
                  2 * Math.PI * 28 * (1 - frameworkProgress.completionPercentage / 100)
                }`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            {/* Percentage text in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-green-600">
                {frameworkProgress.completionPercentage}%
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">Framework Completion</p>
        {/* Horizontal Progress Bar */}
        <progress
          className="progress progress-success w-full mb-3"
          value={frameworkProgress.completionPercentage}
          max="100"
        ></progress>
        <div className="flex flex-col items-center justify-between">
          <span className="text-sm text-gray-600">
            {frameworkProgress.sectionsComplete} of {frameworkProgress.totalSections} complete
          </span>
          <span className="text-sm font-medium text-green-600">
            {frameworkProgress.progressMessage}
          </span>
        </div>
      </div>

      {/* Framework Progress Section */}
      <div className="mb-6 bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Framework Progress ({frameworkProgress.frameworkName})
        </h2>
        <div className="space-y-3">
          {frameworkProgress.sections.map((section, index) => {
            const IconComponent = getSectionIcon(section.name);
            const status = section.status?.toLowerCase() || "";
            const isGood = status === "good";
            const isPartial = status === "partial";
            const isMissing = status === "missing";

            // Determine styling based on status
            let cardClasses = "flex items-center gap-3 rounded-lg p-4 ";
            let iconColor = "";
            let statusTextColor = "";
            let indicatorIcon = null;

            if (isGood) {
              cardClasses += "bg-white border border-gray-200";
              iconColor = "text-blue-600";
              statusTextColor = "text-gray-600";
              indicatorIcon = <CheckCircleIcon className="h-6 w-6 text-blue-600" />;
            } else if (isPartial) {
              cardClasses += "bg-yellow-50 border border-yellow-300";
              iconColor = "text-yellow-600";
              statusTextColor = "text-yellow-700";
              indicatorIcon = <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />;
            } else if (isMissing) {
              cardClasses += "bg-orange-50 border border-orange-200";
              iconColor = "text-orange-600";
              statusTextColor = "text-orange-600";
              indicatorIcon = <ExclamationCircleIcon className="h-6 w-6 text-orange-600" />;
            } else {
              // Fallback for unknown status
              cardClasses += "bg-white border border-gray-200";
              iconColor = "text-gray-600";
              statusTextColor = "text-gray-600";
              indicatorIcon = <ExclamationTriangleIcon className="h-6 w-6 text-gray-600" />;
            }

            return (
              <div key={index} className={cardClasses}>
                <div className={`flex-shrink-0 ${iconColor}`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{section.name}</p>
                  <p className={`text-sm capitalize ${statusTextColor}`}>{section.status}</p>
                </div>
                <div className="flex-shrink-0">{indicatorIcon}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Spent Per Section */}
      <div className="mb-6 bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Time Spent Per Section</h2>
        </div>
        <div className="space-y-0">
          {timePerSection.map((item, index) => {
            const section = frameworkProgress.sections.find(
              (s) => s.name.toLowerCase() === item.sectionName.toLowerCase()
            );
            const status = section?.status?.toLowerCase() || "";
            const isIncomplete = status === "partial" || status === "missing";
            const isLast = index === timePerSection.length - 1;

            return (
              <div
                key={index}
                className={`flex items-center justify-between py-2 ${
                  !isLast ? "border-b border-gray-200" : ""
                }`}
              >
                <span className={`text-sm ${isIncomplete ? "text-orange-600" : "text-gray-700"}`}>
                  {item.sectionName}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isIncomplete ? "text-orange-600" : "text-gray-700"
                  }`}
                >
                  {formatTime(item.seconds)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* KEY INSIGHT Section */}
      {keyInsight && (
        <div className="mb-6 bg-blue-50 rounded-lg p-6 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <LightBulbIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">KEY INSIGHT</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{keyInsight}</p>
        </div>
      )}

      {/* Next Question Button */}
      <div className="flex justify-end mt-auto pt-6">
        <button
          onClick={onNextQuestion}
          className="btn btn-primary bg-gray-900 hover:bg-gray-800 text-white border-none"
        >
          {isLastQuestion ? "Finish Practice" : "Next Question"}
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default QuestionReport;
