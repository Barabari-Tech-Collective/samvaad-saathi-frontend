"use client";

import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useEffect } from "react";
import { GenerateQuestionsResponse } from "../types";

interface QuestionProps {
    isLoading: boolean;
    question: GenerateQuestionsResponse["items"][number] | undefined;
    currentQuestionIndex: number;
    totalQuestions: number;
    onSpeakingChange?: (isSpeaking: boolean) => void;
}

const Question = ({
    isLoading,
    question,
    currentQuestionIndex = 0,
    totalQuestions = 0,
    onSpeakingChange,
}: QuestionProps) => {
    // Use text-to-speech hook
    const { isSpeaking } = useTextToSpeech({
        text: question?.text,
        disabled: isLoading,
    });

    // Notify parent when speaking state changes
    useEffect(() => {
        if (onSpeakingChange) {
            onSpeakingChange(isSpeaking);
        }
    }, [isSpeaking]);

    if (isLoading) {
        return (
            <div className="w-full py-6 animate-pulse">
                {/* Top Row with Counter Skeleton */}
                <div className="flex justify-end mb-2">
                    <div className="h-6 w-8 bg-slate-200 rounded"></div>
                </div>

                {/* Question Text Skeleton */}
                <div className="mb-8 space-y-3">
                    <div className="h-6 bg-slate-200 rounded w-full"></div>
                    <div className="h-6 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-6 bg-slate-200 rounded w-4/6"></div>
                </div>

                {/* Tag Skeleton */}
                <div className="flex">
                    <div className="h-8 w-32 bg-slate-200 rounded-full"></div>
                </div>
            </div>
        );
    }

    if (!question) return null;

    return (
        <div className="w-full py-6">
            {/* Top Row with Counter */}
            <div className="mb-2">
                <span className="text-lg text-slate-900 font-medium">
                    Question {currentQuestionIndex + 1}:
                </span>
            </div>

            {/* Question Text */}
            <div className="mb-4">
                <p className="text-xl leading-[1.4] text-slate-900 font-normal">
                    {question.text}
                </p>
            </div>

            {/* Tag */}
            {!!question?.category ? (
                <div className="flex">
                    <span
                        className={`badge badge-sm ${question.category?.toLowerCase() === "tech"
                            ? "badge-primary"
                            : question.category?.toLowerCase() === "behavioral"
                                ? "badge-warning"
                                : question.category?.toLowerCase() === "tech_allied"
                                    ? "badge-success"
                                    : "badge-secondary"
                            }`}
                    >
                        {question?.category?.replaceAll("_", " ")?.toUpperCase()}
                    </span>
                </div>
            ) : null}
        </div>
    );
};

export default Question;
