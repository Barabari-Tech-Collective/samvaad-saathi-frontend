import React from "react";
import { PerQuestionAnalysisProps } from "./types";

const PerQuestionAnalysis: React.FC<PerQuestionAnalysisProps> = ({ questionAnalysis }) => {
  const getQuestionTypeBadgeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("technical question")) {
      return "bg-blue-100 text-blue-700";
    } else if (lowerType.includes("technical allied")) {
      return "bg-green-100 text-green-700";
    } else if (lowerType.includes("behavioral")) {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4" id="per-question-analysis">
      {questionAnalysis?.map((question, index) => {
        const hasFeedback = question.feedback !== null;

        return (
          <div
            key={question.id}
            className="collapse collapse-arrow bg-[#EEEFFC] rounded-xl shadow-sm"
          >
            <input type="checkbox" className="peer" />
            <div className="collapse-title">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs ${getQuestionTypeBadgeColor(
                        question.type
                      )}`}
                    >
                      {question.type}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {index + 1}/{question.totalQuestions}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{question.question}</p>
              </div>
            </div>
            <div className="collapse-content">
              {hasFeedback ? (
                <div className="space-y-6">
                  {question.feedback?.strengths && (
                    <section className="space-y-3">
                      <h4 className="text-base font-semibold text-emerald-600">Strengths</h4>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {question.feedback?.strengths}
                      </p>
                    </section>
                  )}
                  {question.feedback?.areasOfImprovement && (
                    <section className="space-y-3">
                      <h4 className="text-base font-semibold text-red-600">Areas of Improvement</h4>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {question.feedback?.areasOfImprovement}
                      </p>
                    </section>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p className="text-sm">No report available — question not attempted.</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PerQuestionAnalysis;
