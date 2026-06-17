"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { setInterviewQuestions } from "@/lib/interview-session-storage";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";

interface QuestionItem {
  interviewQuestionId: number;
  text: string;
  topic: string;
  status: string;
  resumeUsed: boolean;
  category: string;
}

interface QuestionsResponse {
  interviewId: number;
  items: QuestionItem[];
  nextCursor: number;
  limit: number;
}

const ReAttemptInterview = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { useQuery } = createApiClient(APIService.INTERVIEWS);

  // Extract query parameters
  const interviewId = searchParams.get("interviewId");
  const role = searchParams.get("role");
  const attemptsCount = searchParams.get("attemptsCount");

  // State for question selection
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch questions using the QUESTIONS API
  const {
    data: questionsData,
    isLoading,
    error,
  } = useQuery<QuestionsResponse>({
    key: [ENDPOINTS.INTERVIEWS.QUESTIONS(interviewId || ""), "questions"],
    url: ENDPOINTS.INTERVIEWS.QUESTIONS(interviewId || ""),
    method: "get",
    enabled: !!interviewId,
  });

  // Handle individual question selection
  const handleQuestionSelect = (questionId: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
    setSelectAll(newSelected.size === questionsData?.items.length);
  };

  // Handle select all functionality
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedQuestions(new Set());
      setSelectAll(false);
    } else {
      const allQuestionIds = new Set(questionsData?.items.map((q) => q.interviewQuestionId) || []);
      setSelectedQuestions(allQuestionIds);
      setSelectAll(true);
    }
  };

  // Handle reattempt button click
  const handleReattempt = () => {
    if (selectedQuestions.size === 0) {
      alert("Please select at least one question to reattempt.");
      return;
    }

    // Get selected question objects
    const selectedQuestionObjects =
      questionsData?.items.filter((question) =>
        selectedQuestions.has(question.interviewQuestionId)
      ) || [];

    setInterviewQuestions(Number(interviewId), selectedQuestionObjects);

    const queryParams = new URLSearchParams({
      interviewId: interviewId || "",
      role: role || "",
      useResume: "false",
      reattempt: "true",
    });

    router.push(`/interview?${queryParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-56px)] py-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-[20px] font-semibold text-primary mb-4">Reattempt Interview</h2>

          {/* Interview Details Card Skeleton */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="skeleton h-6 w-32 mb-2"></div>
            <div className="skeleton h-4 w-40"></div>
          </div>

          {/* Question Selection Section Skeleton */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row mb-4">
              <div className="skeleton h-6 w-64 mb-2"></div>
              <div className="flex items-center justify-end gap-2 pr-4">
                <div className="skeleton h-4 w-20"></div>
                <div className="skeleton h-5 w-5 rounded"></div>
              </div>
            </div>

            {/* Questions List Skeleton */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card bg-base-100 shadow-lg">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="skeleton h-5 w-20 rounded-full"></div>
                      <div className="flex items-center gap-2">
                        <div className="skeleton h-4 w-12"></div>
                        <div className="skeleton h-5 w-5 rounded"></div>
                      </div>
                    </div>
                    <div className="skeleton h-4 w-full"></div>
                    <div className="skeleton h-4 w-5/6 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Button Skeleton */}
          <div className="flex justify-center">
            <div className="skeleton h-12 w-full rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !questionsData) {
    return (
      <div className="min-h-[calc(100dvh-56px)] py-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-[20px] font-semibold text-primary mb-4">Reattempt Interview</h2>
          <div className="alert alert-error">
            <span>Failed to load questions. Please try again.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] py-6">
      <div className="max-w-md mx-auto">
        <h2 className="text-[20px] font-semibold text-primary mb-4">Reattempt Interview</h2>

        {/* Interview Details Card */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <h3 className="text-lg font-bold text-primary mb-2">{role}</h3>
          <p className="text-sm text-primary mb-1">Attempt No. - {attemptsCount}</p>
        </div>

        {/* Question Selection Section */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row mb-4">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Select the questions you want to reattempt
            </h3>
            <label className="flex items-center justify-end gap-2 cursor-pointer pr-4">
              <span className="text-sm font-medium text-primary">Select All</span>
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selectAll}
                onChange={handleSelectAll}
              />
            </label>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {questionsData.items.map((question, index) => (
              <div
                key={question.interviewQuestionId}
                className={`card bg-base-100 shadow-lg ${
                  selectedQuestions.has(question.interviewQuestionId) ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="card-body p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`badge badge-xs ${
                        question?.category?.toLowerCase() === "tech"
                          ? "badge-primary"
                          : question?.category?.toLowerCase() === "behavioral"
                            ? "badge-warning"
                            : question?.category?.toLowerCase() === "tech_allied"
                              ? "badge-success"
                              : "badge-secondary"
                      }`}
                    >
                      {question?.category
                        ? question?.category?.replaceAll("_", " ")?.toUpperCase()
                        : "QUESTION"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {index + 1}/{questionsData.items.length}
                      </span>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedQuestions.has(question.interviewQuestionId)}
                        onChange={() => handleQuestionSelect(question.interviewQuestionId)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-primary font-medium">{question.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reattempt Button */}
        <div className="flex justify-center">
          <button
            onClick={handleReattempt}
            className="btn btn-primary btn-lg w-full"
            disabled={selectedQuestions.size === 0}
          >
            Reattempt ({selectedQuestions.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReAttemptInterview;
