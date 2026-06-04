import ConcentricRadialProgress from "@/components/ConcentricRadialProgress";
import DifficultyTag from "@/components/DifficultyTag";
import Link from "next/link";

import { formatDate } from "@/lib/utils";
import { getMetricLabels } from "@/lib/interview-metrics";
import { InterviewItem } from "./types";

interface CompletedInterviewCardProps {
  item: InterviewItem;
}

export default function CompletedInterviewCard({ item }: CompletedInterviewCardProps) {
  const metricLabels = getMetricLabels(item?.track);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 relative">
      {/* Role Title - Top Left */}
      <h3 className="text-lg font-bold text-black mb-2">{item?.track}</h3>

      {/* Date and Attempt - Below Title */}
      <p className="text-sm text-black mb-4">
        {formatDate(item?.createdAt)} / Attempt: {item?.attemptsCount ?? 0}
      </p>

      {/* Difficulty Label - Top Right */}
      <div className="absolute top-4 right-4">
        <DifficultyTag difficulty={item?.difficulty} />
      </div>

      {/* Progress indicators */}
      {(item?.knowledgePercentage !== undefined || item?.speechFluencyPercentage !== undefined) && (
        <div className="flex items-center gap-4 mb-4">
          <ConcentricRadialProgress
            size={150}
            rings={[
              {
                value: item.knowledgePercentage ?? 0,
                color: "#3b82f6",
                ariaLabel: `${metricLabels.firstMetric} progress`,
                trackColor: "#e5e5e5",
              },
              {
                value: item.speechFluencyPercentage ?? 0,
                color: "#6b7280",
                ariaLabel: `${metricLabels.secondMetric} progress`,
                trackColor: "#bedbff",
              },
            ]}
            centerRender={(rings) => (
              <div className="leading-4">
                <div className="text-sm text-blue-500">
                  {rings[0]?.value ? `${Math.round(rings[0].value)}%` : "-- %"}
                </div>
                <div className="text-sm">
                  {rings[1]?.value ? `${Math.round(rings[1].value)}%` : "-- %"}
                </div>
              </div>
            )}
          />
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Total Average Score</p>
            <p className="text-sm text-gray-600 mb-3">Total no. of attempts - 1</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2">
                  <svg width="8" height="8" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="4" fill="#3b82f6" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{metricLabels.firstMetric}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2">
                  <svg width="8" height="8" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="4" fill="#6b7280" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{metricLabels.secondMetric}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Report Button - Bottom Right */}
      <div className="flex justify-end gap-2">
        <Link
          href={`/reattempt-interview?interviewId=${item.interviewId}&role=${item.track}&attemptsCount=${item.attemptsCount}`}
          className="btn btn-neutral btn-sm"
        >
          Reattempt
        </Link>
        <Link
          href={`/report-summary?interviewId=${item.interviewId}`}
          className="btn btn-outline btn-sm"
        >
          View Report
        </Link>
      </div>
    </div>
  );
}
