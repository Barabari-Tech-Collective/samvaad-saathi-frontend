"use client";
import React from "react";

interface WelcomeProps {
  role: string;
  onInterviewStart: () => void;
  isGeneratingQuestions: boolean;
}

const Welcome = ({ role, onInterviewStart, isGeneratingQuestions }: WelcomeProps) => {
  return (
    <div className="">
      <div className="flex-1">
        <h3 className="text-primary text-2xl font-bold tracking-wide uppercase">{role}</h3>
      </div>

      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 py-12">
        {/* Heading */}
        <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight text-center">
          Welcome to {role} Interview
        </h2>

        {/* Duration Card */}
        <div className="card bg-blue-50 border border-blue-500 shadow-sm w-full max-w-xs">
          <div className="card-body items-center text-center py-6">
            <h3 className="card-title text-xl font-medium text-gray-900">Interview Duration</h3>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="font-orbitron text-2xl font-bold text-gray-900 tracking-wider">
                25 : 00
              </span>
              <span className="text-md font-medium text-gray-600">mins</span>
            </div>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="card bg-[#EFEEF6] w-full rounded-xl">
          <div className="card-body px-8 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              Instructions
            </h3>
            <ul className="space-y-2 text-gray-800 font-medium text-md leading-relaxed list-disc pl-5 marker:text-gray-800">
              <li>This is a timed mock interview</li>
              <li>The interview ends in 25 mins</li>
              <li>Expected time for each question is 3 mins.</li>
              <li>You can take more time than that depending on the question</li>
            </ul>

            <div className="mt-6 flex justify-center">
              <button
                onClick={onInterviewStart}
                className="btn btn-primary px-8 text-lg"
                disabled={isGeneratingQuestions}
              >
                {isGeneratingQuestions ? "Generating questions..." : "Click here to continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
