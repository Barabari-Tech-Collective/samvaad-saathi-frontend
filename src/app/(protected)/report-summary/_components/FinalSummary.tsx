import React from "react";
import { FinalSummaryProps } from "./types";

const FinalSummary: React.FC<FinalSummaryProps> = ({ speechFluencyFeedback }) => {
  return (
    <div id="final-summary">
      <div className="bg-[#EEEFFC] p-6 rounded-lg shadow-lg ">
        {/* Main Title */}
        <h2 className="text-2xl font-semibold text-fuchsia-600 mb-6">Speech Fluency</h2>

        <div className="space-y-6">
          {/* Strengths Section */}
          {speechFluencyFeedback.strengths && (
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-3">Strengths</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {speechFluencyFeedback.strengths}
              </p>
            </div>
          )}

          {/* Areas of Improvement Section */}
          {speechFluencyFeedback.areasOfImprovement && (
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-3">Areas Of Improvement</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {speechFluencyFeedback.areasOfImprovement}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalSummary;
