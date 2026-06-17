"use client";

import { PlayIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Pacing from "@/components/icons/Pacing";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import type { PacingLevelsResponse } from "@/lib/pacing-practice/types";

const LevelsPage = () => {
  const apiClient = createApiClient(APIService.PACING);
  const { data, isLoading, error } = apiClient.useQuery<PacingLevelsResponse>({
    key: ["pacing-levels"],
    url: ENDPOINTS.PACING.LEVELS,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 min-h-full bg-base-200/30">
        <div className="flex flex-col items-center text-center gap-2 pt-4">
          <div className="w-16 h-16 flex items-center justify-center">
            <Pacing className="w-16 h-16 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-black">Speech Pacing Practice</h1>
          <p className="text-gray-600">Practice speaking at the right pace for interviews</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6 p-6 min-h-full bg-base-200/30">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-600">Failed to load levels. Please try again.</p>
        </div>
      </div>
    );
  }

  const { levels, overallReadiness } = data;

  const lastUnlockedLevel = levels.filter((l) => l.status !== "locked").pop() ?? levels[0];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "complete":
        return "badge-success";
      case "in_progress":
        return "badge-primary";
      case "locked":
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete":
        return "Complete";
      case "in_progress":
        return "In Progress";
      case "locked":
      default:
        return "Locked";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full bg-base-200/30">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2 pt-4">
        <div className="w-16 h-16 flex items-center justify-center">
          <Pacing className="w-16 h-16 text-black" />
        </div>
        <h1 className="text-2xl font-bold text-black">Speech Pacing Practice</h1>
        <p className="text-gray-600">Practice speaking at the right pace for interviews</p>
      </div>

      {/* Overall Readiness */}
      <div className="card bg-white shadow-sm border border-gray-100 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-black text-lg">Overall Readiness</span>
          <span className="font-bold text-blue-600 text-lg">{overallReadiness}%</span>
        </div>
        <progress
          className="progress progress-primary w-full h-3"
          value={overallReadiness}
          max="100"
        />
      </div>

      {/* Level Cards */}
      <div className="flex flex-col gap-4">
        {levels.map((level) => {
          const isLocked = level.status === "locked";
          const cardClass = `card relative p-5 ${
            isLocked
              ? "bg-gray-50 shadow-none border border-gray-100 opacity-60"
              : "bg-white shadow-sm border border-gray-100"
          }`;
          const content = (
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2
                  className={`font-bold text-lg mb-1 ${isLocked ? "text-gray-500" : "text-black"}`}
                >
                  {level.name}
                </h2>
                <p className={`text-sm mb-4 pr-12 ${isLocked ? "text-gray-400" : "text-gray-500"}`}>
                  {level.description}
                </p>
                <div className="flex justify-between items-center">
                  <span
                    className={`badge badge-soft text-xs px-3 py-2 font-medium ${
                      level.status !== "locked" ? getStatusBadgeClass(level.status) : ""
                    }`}
                  >
                    {getStatusLabel(level.status)}
                  </span>
                  <span className="text-xs text-gray-400">{level.unlockMessage}</span>
                </div>
              </div>
              {isLocked ? (
                <LockClosedIcon className="w-5 h-5 text-gray-400 ml-2 shrink-0" />
              ) : (
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-200 ml-2 shrink-0">
                  <PlayIcon className="w-5 h-5" />
                </span>
              )}
            </div>
          );
          return isLocked ? (
            <div key={level.level} className={cardClass}>
              {content}
            </div>
          ) : (
            <Link
              key={level.level}
              href={`/control-your-pace/level-intro?level=${level.level}`}
              className={`${cardClass} block cursor-pointer hover:shadow-md transition-shadow`}
              aria-label={`Start ${level.name}`}
            >
              {content}
            </Link>
          );
        })}
      </div>

      {/* CTA - Start last unlocked level */}
      <div className="mt-auto pb-4">
        <Link
          href={`/control-your-pace/level-intro?level=${lastUnlockedLevel.level}`}
          className="btn btn-neutral btn-block btn-lg bg-[#0F172A] text-white rounded-xl"
        >
          Start level {lastUnlockedLevel.level} Practice
        </Link>
      </div>
    </div>
  );
};

export default LevelsPage;
