"use client";

import PageHeading from "@/components/studio/PageHeading";
import { CheckCircleIcon, ClockIcon, MicrophoneIcon } from "@heroicons/react/24/outline";
import { useMicPermission, MicPermissionModal } from "@/hooks/useMicPermission";
import { useRouter, useSearchParams } from "next/navigation";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import type { PacingLevelsResponse } from "@/lib/pacing-practice/types";

const LEVEL_NAMES: Record<number, string> = {
  1: "Level 1 - Sentence Control",
  2: "Level 2 - Paragraph Fluency",
  3: "Level 3 - Interview Mastery",
};

const LevelIntroPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const level = searchParams.get("level") ? Number(searchParams.get("level")) : 1;
  const apiClient = createApiClient(APIService.PACING);
  const { data: levelsData } = apiClient.useQuery<PacingLevelsResponse>({
    key: ["pacing-levels"],
    url: ENDPOINTS.PACING.LEVELS,
  });
  const levelTitle =
    levelsData?.levels?.find((l) => l.level === level)?.name ??
    LEVEL_NAMES[level] ??
    `Level ${level}`;
  const { hasPermission, showModal, requestPermission, showPermissionModal, hidePermissionModal } =
    useMicPermission();

  const handleStartPractice = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        showPermissionModal();
        return;
      }
    }
    router.push(`/control-your-pace/practice?level=${level}`);
  };

  return (
    <div className="studio-stack">
      <PageHeading
        eyebrow="Speaking speed"
        title={levelTitle}
        description="A short speaking exercise to help you hear your rhythm and choose where to pause."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* What you'll practice */}
        <div className="studio-panel">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-bold text-black text-lg">What you&apos;ll practice</h2>
          </div>
          <ul className="space-y-4">
            {[
              "Speaking speed (Words Per Minute)",
              "Pause patterns and duration",
              "Filler word frequency (um, uh, like)",
              "Sentence clarity and completion",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Target benchmarks */}
        <div className="studio-panel space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="font-bold text-black text-lg">Target benchmarks</h2>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-100 rounded-2xl p-4 flex justify-between items-center border border-gray-50">
              <div>
                <h3 className="font-bold text-black text-sm">WPM (Words Per Minute)</h3>
                <p className="text-xs text-gray-500">Ideal speaking pace for interviews</p>
              </div>
              <span className="text-blue-600 font-bold text-base">120-150</span>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4 flex justify-between items-center border border-gray-50">
              <div>
                <h3 className="font-bold text-black text-sm">Pause Distribution</h3>
                <p className="text-xs text-gray-500">Short pauses every 8-12 words</p>
              </div>
              <span className="text-green-500 font-bold text-base">Natural</span>
            </div>

            <div className="bg-gray-100  rounded-2xl p-4 flex justify-between items-center border border-gray-50">
              <div>
                <h3 className="font-bold text-black text-sm">Filler Words</h3>
                <p className="text-xs text-gray-500">Minimize um, uh, like, you know</p>
              </div>
              <span className="text-purple-600 font-bold text-base">{"< 3 per min"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pb-6">
        <button
          onClick={handleStartPractice}
          className="btn btn-neutral btn-block btn-lg rounded-lg"
        >
          <MicrophoneIcon className="w-5 h-5 mr-2" />
          Start Practice
        </button>
      </div>

      <MicPermissionModal
        isOpen={showModal}
        onClose={hidePermissionModal}
        onRequestPermission={requestPermission}
      />
    </div>
  );
};

export default LevelIntroPage;
