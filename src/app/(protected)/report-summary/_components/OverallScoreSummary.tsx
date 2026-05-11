import Image from "next/image";
import React from "react";
import SectionCard from "./SectionCard";
import { OverallScoreSummaryProps } from "./types";

const OverallScoreSummary: React.FC<OverallScoreSummaryProps> = ({
  knowledgeCompetence,
  speechAndStructure,
}) => {
  return (
    <SectionCard title="Overall Score Summary">
      <div className="space-y-8">
        {/* Knowledge Competence */}
        {!!knowledgeCompetence ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <Image
                    src="/brain.png"
                    alt="Knowledge Competence"
                    width={20}
                    height={20}
                    unoptimized
                  />
                </div>
                <h3 className="font-semibold text-black">
                  Knowledge Competence
                </h3>
              </div>
              <span className="badge badge-ghost bg-stone-300">
                {knowledgeCompetence.score}/{knowledgeCompetence.maxScore}
              </span>
            </div>

            {/* Progress Bar */}
            <progress
              className="progress w-full"
              value={knowledgeCompetence.percentage}
              max="100"
            ></progress>

            {/* Criteria Breakdown - Horizontal */}
            <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
              {Object.entries(knowledgeCompetence.criteria).map(
                ([key, value]) => (
                  <span key={key} className="capitalize">
                    {key} ({value})
                  </span>
                ),
              )}
            </div>

            {/* Summary Scores */}
            <div className="flex justify-between items-center">
              <span className="text-black">
                Average: {knowledgeCompetence.average}/
                {knowledgeCompetence.maxAverage}
              </span>
              <span className="text-green-600 font-semibold text-lg">
                {knowledgeCompetence.percentage}%
              </span>
            </div>
            <div className="divider" />
          </div>
        ) : null}

        {/* Speech & Structure */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center">
                <Image
                  src="/text-to-speech.png"
                  alt="Speech & Structure"
                  width={20}
                  height={20}
                  unoptimized
                />
              </div>
              <h3 className="font-semibold text-black">Speech & Structure</h3>
            </div>
            <span className="badge badge-ghost bg-stone-300">
              {speechAndStructure.score}/{speechAndStructure.maxScore}
            </span>
          </div>

          {/* Progress Bar */}
          <progress
            className="progress w-full"
            value={speechAndStructure.percentage}
            max="100"
          ></progress>

          {/* Criteria Breakdown - Horizontal */}
          <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
            {Object.entries(speechAndStructure.criteria).map(([key, value]) => (
              <span key={key} className="capitalize">
                {key} ({value})
              </span>
            ))}
          </div>

          {/* Summary Scores */}
          <div className="flex justify-between items-center">
            <span className="text-black">
              Average: {speechAndStructure.average}/
              {speechAndStructure.maxAverage}
            </span>
            <span className="text-green-600 font-semibold text-lg">
              {speechAndStructure.percentage}%
            </span>
          </div>
          <div className="divider" />
        </div>
      </div>
    </SectionCard>
  );
};

export default OverallScoreSummary;
