"use client";

import { ROLE_OPTIONS } from "@/lib/constants";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Link from "next/link";
import { useState } from "react";

const StructureYourAnswerPage = () => {
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const handleStartPractice = () => {
    setShowRoleSelection(true);
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
  };

  if (showRoleSelection) {
    return (
      <div className="flex flex-col items-center justify-center pt-10 gap-6 px-6">
        <div className="w-full max-w-md">
          <h2 className="text-lg font-bold text-black mb-2">Role</h2>
          <p className="text-sm text-black mb-4">Select A Role</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className={`px-4 py-3 rounded-lg font-medium text-black transition-colors ${
                  selectedRole === role
                    ? "bg-yellow-100 border-2 border-yellow-400"
                    : "bg-gray-100 border border-transparent hover:bg-gray-200"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <Link href={`/structure-your-answer/interview?role=${encodeURIComponent(selectedRole)}`}>
            <button disabled={!selectedRole} className="btn btn-neutral btn-block">
              Get Started
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pt-10 gap-4">
      <p>Practice structured answers to interview questions and build clarity under pressure.</p>

      {/* Lottie Animation */}
      <div className="w-48 h-48 mx-auto mb-6">
        <DotLottieReact src="/assets/lottie/Structure-icon.lottie" autoplay loop />
      </div>

      <p>Each question uses a specific framework—focus on structure, not perfection.</p>

      {/* <button className="btn btn-outline" disabled>
        View Sample Answers
      </button> */}

      <button className="btn btn-primary" onClick={handleStartPractice}>
        Start Today&apos;s Practice
      </button>
    </div>
  );
};
export default StructureYourAnswerPage;
