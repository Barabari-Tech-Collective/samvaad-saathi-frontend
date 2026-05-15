"use client";

import Pacing from "@/components/icons/Pacing";
import { ChatBubbleLeftRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { ChartBarIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import pacingFeatures from "./pacing-features.json";

interface PacingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
}

const iconMap = {
  clock: ClockIcon,
  chatBubble: ChatBubbleLeftRightIcon,
} as const;

const ControlYourPacePage = () => {
  const features = pacingFeatures as PacingFeature[];

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

      {/* Feature cards */}
      <div className="flex flex-col gap-4">
        {features.map((feature) => {
          const IconComponent =
            iconMap[feature.icon as keyof typeof iconMap] ?? ChatBubbleLeftRightIcon;
          return (
            <div key={feature.id} className="card bg-white shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${feature.iconBgClass} ${feature.iconColorClass}`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg text-black mb-1">{feature.title}</h2>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-auto pb-4">
        <Link
          href="/control-your-pace/levels"
          className="btn btn-neutral btn-block btn-lg bg-[#0F172A] text-white rounded-xl"
        >
          Start
        </Link>
      </div>
    </div>
  );
};

export default ControlYourPacePage;
