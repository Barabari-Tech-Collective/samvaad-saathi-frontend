"use client";

import { trackButtonClick } from "@/lib/posthog/tracking.utils";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

const PracticePage = () => {
  const practiceModules = [
    {
      id: 1,
      title: "Structure Your Answers",
      description: "Learn how to frame your responses with clarity, logic, and flow.",
      gradient: "from-purple-100 to-purple-200",
      shadowColor: "purple",
      href: "/structure-your-answer",
    },
    {
      id: 2,
      title: "Master Your Pronunciation",
      description: "Learn how to frame your responses with clarity, logic, and flow.",
      gradient: "from-yellow-100 to-amber-100",
      shadowColor: "amber",
      href: "/pronunciation-practice",
    },
    {
      id: 3,
      title: "Control Your Pace",
      description: "Improve your pacing and reduce filler words for smoother responses.",
      gradient: "from-pink-100 to-rose-200",
      shadowColor: "rose",
      href: "/control-your-pace",
    },
  ];

  return (
    <div className="flex flex-col py-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1f285b] mb-3">Answer Smarter</h1>
        <p className="text-base text-gray-700">
          Practice structuring your answers, improving clarity, and speaking with confidence.
        </p>
      </div>

      {/* Practice Modules */}
      <div className="flex flex-col gap-6">
        {practiceModules.map((module) => (
          <Link
            href={module.href || ""}
            key={module.id}
            onClick={() =>
              trackButtonClick(
                `practice_module_${module.title.toLowerCase().replace(/\s/g, "_")}`,
                "practice_page"
              )
            }
          >
            <div
              key={module.id}
              className={`relative rounded-2xl bg-gradient-to-br ${module.gradient} p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:shadow-${module.shadowColor}-400/50 cursor-pointer`}
            >
              <div className="flex flex-col gap-3">
                <h2 className="text-xl font-bold text-gray-900">{module.title}</h2>
                <p className="text-base text-gray-700">{module.description}</p>
                <div className="flex justify-end mt-2">
                  <button className="btn btn-neutral cursor-pointer rounded-lg">
                    <span>Practice Now</span>
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PracticePage;
