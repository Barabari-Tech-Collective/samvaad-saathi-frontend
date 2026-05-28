"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnswerTypeStep, QuestionReport } from "./_components";

interface Question {
  text: string;
  index: number;
  sections: string[];
  framework: string;
  question_id: number;
  current_hint: string;
  structure_hint: string;
  current_section: string;
}

interface StructuredPracticeResponse {
  practiceId: number;
  interviewId: number;
  track: string;
  questions: Question[];
  status: string;
  createdAt: string;
}

const StructureYourAnswerInterviewPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("interviewId");
  const role = searchParams.get("role");

  const [structuredPractice, setStructuredPractice] = useState<StructuredPracticeResponse | null>(
    null
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [hasStartedPractice, setHasStartedPractice] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const { mutateAsync: generateStructuredPractice } = apiClient.useMutation<
    StructuredPracticeResponse,
    { interviewId?: string; track?: string; difficulty?: string }
  >({
    url: ENDPOINTS_V2.GENERATE_STRUCTURED_PRACTICE,
    method: "post",
  });

  useEffect(() => {
    const callApi = async () => {
      try {
        setIsLoading(true);
        const requestData: {
          interviewId?: string;
          track?: string;
          difficulty?: string;
        } = {};
        if (interviewId) {
          requestData.interviewId = interviewId;
        }
        if (role) {
          requestData.track = role;
        }
        requestData.difficulty = "easy";
        const response = await generateStructuredPractice(requestData);
        setStructuredPractice(response);
      } catch (error) {
        console.error("Error calling API:", error);
      } finally {
        setIsLoading(false);
      }
    };

    callApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, role]);

  // Auto-hide welcome screen after 2 seconds when loading completes
  useEffect(() => {
    if (!isLoading && showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, showWelcome]);

  // Reset section index and practice state when question changes
  useEffect(() => {
    setCurrentSectionIndex(0);
    setShowReport(false);
    setHasStartedPractice(false);
  }, [currentQuestionIndex]);

  const currentQuestion = structuredPractice?.questions[currentQuestionIndex];
  const currentSections = currentQuestion?.sections || [];
  const currentSection = currentSections[currentSectionIndex];
  const totalSections = currentSections.length;

  // Handle completion of current section
  const handleSectionComplete = () => {
    if (currentSectionIndex < totalSections - 1) {
      // Move to next section (don't wait for API call)
      setCurrentSectionIndex((prev) => prev + 1);
    }
  };

  // Handle redo previous section
  const handleRedoPrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  // Handle starting practice for current question
  const handleStartPractice = () => {
    setHasStartedPractice(true);
  };

  // Handle manual analyze action - just show the report, API will be called in QuestionReport
  const handleAnalyze = () => {
    setShowReport(true);
  };

  // Handle moving to next question after report
  const handleNextQuestion = () => {
    if (structuredPractice && currentQuestionIndex < structuredPractice.questions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentSectionIndex(0);
      setShowReport(false);
      setHasStartedPractice(false);
    } else {
      // All questions completed - could redirect to completion page
      // For now, just show a message or redirect
      console.log("All questions completed!");
      router.push("/practice");
    }
  };

  // Handle skipping the current question (from overview, without starting practice)
  const handleSkipQuestion = () => {
    if (structuredPractice && currentQuestionIndex < structuredPractice.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentSectionIndex(0);
      setShowReport(false);
      setHasStartedPractice(false);
    } else {
      router.push("/practice");
    }
  };

  // Welcome screen component (shown during loading and after loading)
  const WelcomeScreen = ({ isLoading }: { isLoading: boolean }) => (
    <div className="flex flex-col h-[80vh] items-center justify-center p-6">
      <div className="relative max-w-md w-full">
        {/* Gradient border using wrapper */}
        <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 rounded-2xl p-[2px] shadow-lg">
          <div className="bg-white rounded-xl p-8">
            <div className="text-gray-800 text-xl font-medium text-center">
              {isLoading
                ? "Generating your practice questions..."
                : "Hi ! Lets start your practice 👋"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show welcome screen during loading or if welcome state is true
  if (isLoading || showWelcome) {
    return <WelcomeScreen isLoading={isLoading} />;
  }

  if (!structuredPractice || !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center pt-10 gap-4">
        <p>No questions available.</p>
      </div>
    );
  }

  // If no sections found, show error
  if (currentSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-10 gap-4">
        <p>No sections found for this question.</p>
      </div>
    );
  }

  // Show report if all sections are completed
  if (showReport) {
    return (
      <QuestionReport
        practiceId={structuredPractice?.practiceId?.toString() || ""}
        questionIndex={currentQuestionIndex}
        onNextQuestion={handleNextQuestion}
        isLastQuestion={currentQuestionIndex === structuredPractice.questions.length - 1}
      />
    );
  }

  // Show question overview with Start Practice button if practice hasn't started
  if (!hasStartedPractice) {
    return (
      <div className="flex flex-col px-6 py-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Today&apos;s Interview Practice</h1>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((currentQuestionIndex + 1) / structuredPractice.questions.length) * 100
                  }%`,
                }}
              ></div>
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {currentQuestionIndex + 1}/{structuredPractice.questions.length}
            </span>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-6">
          <p className="text-lg leading-relaxed text-gray-900">{currentQuestion.text}</p>
        </div>

        {/* Framework Tag */}
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-yellow-100 text-gray-800 text-sm rounded">
            {currentQuestion.framework}
          </span>
        </div>

        {/* Framework Hint */}
        {currentQuestion?.current_hint && (
          <div className="mb-8">
            <p className="text-sm text-gray-700">{currentQuestion?.current_hint}</p>
          </div>
        )}

        {/* Start Practice / Skip Question Buttons */}
        <div className="flex justify-between gap-3">
          <button onClick={handleSkipQuestion} className="btn btn-outline">
            Skip question
          </button>
          <button onClick={handleStartPractice} className="btn btn-neutral">
            Start Practice
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  const previousSection =
    currentSectionIndex > 0 ? currentSections[currentSectionIndex - 1] : undefined;

  return (
    <AnswerTypeStep
      questionText={currentQuestion.text}
      framework={currentQuestion.framework}
      currentSection={currentSection}
      currentStep={currentSectionIndex + 1}
      totalSteps={totalSections}
      practiceId={structuredPractice?.practiceId?.toString() || ""}
      questionIndex={currentQuestionIndex}
      current_hint={currentQuestion?.current_hint}
      onComplete={handleSectionComplete}
      onAnalyze={handleAnalyze}
      onRedoPrevious={handleRedoPrevious}
      onSkipQuestion={handleSkipQuestion}
      hasPreviousSection={currentSectionIndex > 0}
      previousSection={previousSection}
    />
  );
};

export default StructureYourAnswerInterviewPage;
