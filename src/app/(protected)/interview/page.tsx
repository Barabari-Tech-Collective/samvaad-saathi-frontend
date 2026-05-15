"use client";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MicPermissionModal, useMicPermission } from "@/hooks/useMicPermission";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService, APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS, ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { DEFAULT_TTS_VOICE_ID, TTS_VOICE_OPTIONS, TTS_VOICE_STORAGE_KEY } from "@/lib/constants";
import {
  clearInterviewQuestions,
  getInterviewQuestions,
  setInterviewQuestions,
} from "@/lib/interview-session-storage";
import { trackEvent, trackInterviewQuestionView } from "@/lib/posthog/tracking.utils";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CodeView, Footer, Header, Question, Welcome } from "./_components";
import { FollowUpQuestion, GenerateQuestionsResponse, StartQuestionAttemptResponse } from "./types";

const InterviewPage = () => {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const searchParams = useSearchParams();
  const interviewId = searchParams.get("interviewId");
  const useResume = searchParams.get("useResume");
  const role = searchParams.get("role");
  const selectedQuestionsParam = searchParams.get("selectedQuestions");
  const resumed = searchParams.get("resumed") === "true";
  const reattempt = searchParams.get("reattempt") === "true";

  const [hasStarted, setHasStarted] = useState(false);
  const [isIntroducing, setIsIntroducing] = useState(false);
  const [isUserIntroducing, setIsUserIntroducing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<GenerateQuestionsResponse["items"]>([]);
  const [isTextToSpeechSpeaking, setIsTextToSpeechSpeaking] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const questionStartTimeRef = useRef<number>(0);
  const [lastTrackedIndex, setLastTrackedIndex] = useState<number>(-1);

  // mic permission utils
  const { hasPermission, showModal, requestPermission, hidePermissionModal, showPermissionModal } =
    useMicPermission();

  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);
  const interviewsV1Client = createApiClient(APIService.INTERVIEWS);

  const {
    mutateAsync: generateQuestions,
    isPending: isGeneratingQuestions,
    data: generatedQuestions,
  } = apiClient.useMutation<GenerateQuestionsResponse>({
    url: ENDPOINTS_V2.GENERATE_QUESTIONS,
    method: "post",
  });

  const {
    mutateAsync: startQuestionAttempt,
    isPending: isStartingAttempt,
    data: questionAttemptResponse,
  } = apiClient.useMutation<StartQuestionAttemptResponse>({
    url: ENDPOINTS.INTERVIEWS.START_QUESTION_ATTEMPT,
    method: "post",
  });

  interface ResumeInterviewResponse {
    interviewId: number;
    track: string;
    difficulty: string;
    questions: GenerateQuestionsResponse["items"];
    totalQuestions: number;
    attemptedQuestions: number;
    remainingQuestions: number;
  }
  const { mutateAsync: resumeInterview } = interviewsV1Client.useMutation<
    ResumeInterviewResponse,
    { interviewId: number }
  >({
    url: ENDPOINTS.INTERVIEWS.RESUME_INTERVIEW,
    method: "post",
  });

  // Read questions from session storage when resumed or reattempt
  useEffect(() => {
    if (!interviewId || (!resumed && !reattempt)) return;
    const id = Number(interviewId);
    const stored = getInterviewQuestions(id);
    if (Array.isArray(stored) && stored.length > 0) {
      setQuestions(stored as GenerateQuestionsResponse["items"]);
      if (pendingStart) {
        setHasStarted(true);
        setIsIntroducing(true);
        setPendingStart(false);
      }
      return;
    }
    if (resumed) {
      resumeInterview({ interviewId: id })
        .then((response) => {
          setInterviewQuestions(response.interviewId, response.questions);
          setQuestions(response.questions);
          if (pendingStart) {
            setHasStarted(true);
            setIsIntroducing(true);
            setPendingStart(false);
          }
        })
        .catch(() => {
          // Handle resume interview fetch failure
        });
      return;
    }
    if (reattempt) {
      router.push(
        `/reattempt-interview?interviewId=${interviewId}&role=${encodeURIComponent(role || "")}`
      );
    }
  }, [interviewId, resumed, reattempt, pendingStart, role, router, resumeInterview]);

  // Parse selectedQuestions from URL if present (fallback for old links; skip when using session storage)
  useEffect(() => {
    if (resumed || reattempt || !selectedQuestionsParam) return;
    try {
      const parsedQuestions = JSON.parse(
        decodeURIComponent(selectedQuestionsParam)
      ) as GenerateQuestionsResponse["items"];
      if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
        setQuestions(parsedQuestions);
        if (pendingStart) {
          setHasStarted(true);
          setIsIntroducing(true);
          setPendingStart(false);
        }
      }
    } catch (error) {
      // Handle URL parsing error silently
    }
  }, [selectedQuestionsParam, pendingStart, resumed, reattempt]);

  // Update local questions state when generatedQuestions changes
  useEffect(() => {
    if (generatedQuestions?.items && generatedQuestions.items.length > 0) {
      setQuestions(generatedQuestions.items);
      // Start interview if user has clicked the start button
      if (pendingStart) {
        setHasStarted(true);
        setIsIntroducing(true);
        setPendingStart(false);
      }
    }
  }, [generatedQuestions?.items, pendingStart]);

  // Use current question id so we don't re-run when questions array reference changes (e.g. when adding follow-up)
  const currentQuestionId = questions?.[currentQuestionIndex]?.interviewQuestionId;

  useEffect(() => {
    if (currentQuestionId && interviewId) {
      startQuestionAttempt({
        interviewId: Number(interviewId),
        questionId: currentQuestionId,
      });

      // Track question view
      const question = questions?.[currentQuestionIndex];
      if (question) {
        trackInterviewQuestionView(
          question.interviewQuestionId.toString(),
          currentQuestionIndex + 1,
          question.isFollowUp ? "follow-up" : "main",
          interviewId
        );
      }
    }
    // Reset text-to-speech speaking state when question changes
    setIsTextToSpeechSpeaking(false);
  }, [interviewId, currentQuestionIndex, currentQuestionId, startQuestionAttempt, isIntroducing]);

  // Track time taken for each question
  useEffect(() => {
    if (hasStarted && currentQuestionIndex !== lastTrackedIndex) {
      const now = Date.now();

      // If we were on a previous question, track its time
      if (lastTrackedIndex !== -1 && questionStartTimeRef.current !== 0) {
        const timeTaken = Math.round((now - questionStartTimeRef.current) / 1000);
        const prevQuestion = questions[lastTrackedIndex];

        if (prevQuestion) {
          trackEvent("interview_question_time_taken", {
            question_id: prevQuestion.interviewQuestionId,
            question_number: lastTrackedIndex + 1,
            time_spent_seconds: timeTaken,
            interview_id: interviewId,
            question_topic: prevQuestion.topic,
          });
        }
      }

      // Start timer for current question
      questionStartTimeRef.current = now;
      setLastTrackedIndex(currentQuestionIndex);
    }
  }, [hasStarted, currentQuestionIndex, questions, interviewId, lastTrackedIndex]);

  // Generate questions automatically when the welcome screen is shown (skip when loading from session storage)
  useEffect(() => {
    if (
      !hasStarted &&
      !selectedQuestionsParam &&
      !resumed &&
      !reattempt &&
      questions.length === 0 &&
      !isGeneratingQuestions &&
      !generatedQuestions
    ) {
      generateQuestions({
        useResume: useResume === "true",
      });
    }
  }, [
    hasStarted,
    selectedQuestionsParam,
    resumed,
    reattempt,
    questions.length,
    isGeneratingQuestions,
    generatedQuestions,
    useResume,
    generateQuestions,
  ]);

  const handleInterviewStart = () => {
    if (hasPermission) {
      // If questions are currently generating, set pendingStart so it starts once ready
      if (isGeneratingQuestions) {
        setPendingStart(true);
      } else if (questions.length > 0) {
        setHasStarted(true);
        setIsIntroducing(true);
      } else {
        // Fallback: If no questions and not generating, try generating
        setPendingStart(true);
        generateQuestions({
          useResume: useResume === "true",
        });
      }
    } else {
      showPermissionModal();
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      if (isGeneratingQuestions) {
        setPendingStart(true);
      } else if (questions.length > 0) {
        setHasStarted(true);
        setIsIntroducing(true);
      } else {
        setPendingStart(true);
        generateQuestions({
          useResume: useResume === "true",
        });
      }
    }
    return granted;
  };

  const handleNextQuestion = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleFollowUpQuestion = (followUpQuestion: FollowUpQuestion) => {
    // Transform the follow-up question to match the items structure
    const transformedQuestion: GenerateQuestionsResponse["items"][0] = {
      interviewQuestionId: followUpQuestion.interviewQuestionId,
      text: followUpQuestion.text,
      topic: "", // Not provided in follow-up question
      difficulty: null, // Not provided in follow-up question
      category: "", // Not provided in follow-up question
      isFollowUp: true,
      parentQuestionId: followUpQuestion.parentQuestionId,
      followUpStrategy: followUpQuestion.strategy,
      supplement: null, // Not provided in follow-up question
    };

    // Insert the follow-up question right after the current question
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions.splice(currentQuestionIndex + 1, 0, transformedQuestion);
      return newQuestions;
    });
  };

  const { mutateAsync: completeInterview } = apiClient.useMutation({
    url: ENDPOINTS.INTERVIEWS.COMPLETE,
    method: "post",
    options: {
      onSuccess: () => {
        if (interviewId) {
          sessionStorage.removeItem(`interviewEndTime_${interviewId}`);
          clearInterviewQuestions(Number(interviewId));
        }
        router.push(`/interview-completed?interviewId=${interviewId}&role=${role || "Interview"}`);
      },
    },
  });

  const handleInterviewSubmit = () => {
    if (interviewId) {
      // Track time for the final question before submitting
      if (questionStartTimeRef.current !== 0) {
        const timeTaken = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
        const currentQuestion = questions[currentQuestionIndex];

        if (currentQuestion) {
          trackEvent("interview_question_time_taken", {
            question_id: currentQuestion.interviewQuestionId,
            question_number: currentQuestionIndex + 1,
            time_spent_seconds: timeTaken,
            interview_id: interviewId,
            question_topic: currentQuestion.topic,
          });
        }
      }

      completeInterview({
        interviewId: Number(interviewId),
      });
    }
  };

  return (
    <div className="px-8 pt-4">
      {!hasStarted ? (
        <>
          <Welcome
            role={role || ""}
            onInterviewStart={handleInterviewStart}
            isGeneratingQuestions={isGeneratingQuestions}
          />
          <MicPermissionModal
            isOpen={showModal}
            onClose={hidePermissionModal}
            onRequestPermission={handleRequestPermission}
          />
        </>
      ) : isIntroducing ? (
        <div className="flex flex-col items-center justify-center mt-24">
          <div className="size-32 mx-auto mb-8">
            <DotLottieReact
              src="/assets/lottie/Speaker.lottie"
              autoplay
              loop={isTextToSpeechSpeaking}
            />
          </div>
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-800">Introduction</h2>
          <p className="text-xl text-center text-slate-600 max-w-2xl mx-auto">
            Please wait while your interviewer introduces themselves...
          </p>
          <IntroductionSpeaker
            onFinished={() => {
              setIsIntroducing(false);
              setIsUserIntroducing(true);
            }}
            onSpeakingChange={setIsTextToSpeechSpeaking}
          />
        </div>
      ) : isUserIntroducing ? (
        <div>
          <Header
            role={role || ""}
            hasStarted={hasStarted}
            interviewId={interviewId}
            onTimerExpire={handleInterviewSubmit}
          />

          <div className="flex flex-col items-center mt-12 max-w-4xl mx-auto px-4">
            <div className="w-full py-6">
              <div className="mb-2">
                <span className="text-lg text-slate-900 font-medium">Question 0:</span>
              </div>
              <div className="mb-4">
                <p className="text-xl leading-[1.4] text-slate-900 font-normal">
                  Before we begin, please introduce yourself briefly.
                </p>
              </div>
            </div>

            <UserIntroductionSpeaker onSpeakingChange={setIsTextToSpeechSpeaking} />

            <div className="w-full mt-4">
              <Footer
                disabled={isTextToSpeechSpeaking}
                onNext={() => setIsUserIntroducing(false)}
                isIntroStep={true}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Header
            role={role || ""}
            hasStarted={hasStarted}
            interviewId={interviewId}
            onTimerExpire={handleInterviewSubmit}
          />

          {isMobile ? (
            <>
              <div className="size-24 mx-auto mb-4">
                <DotLottieReact src="/assets/lottie/Speaker.lottie" autoplay loop />
              </div>

              <Question
                isLoading={isGeneratingQuestions}
                question={questions?.[currentQuestionIndex]}
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={questions?.length || 0}
                onSpeakingChange={setIsTextToSpeechSpeaking}
                role={role || ""}
                allowSpeech={!isIntroducing}
              />
              <CodeView
                isLoading={isGeneratingQuestions}
                supplement={questions?.[currentQuestionIndex]?.supplement || null}
              />
            </>
          ) : (
            <>
              <div className="grid grid-cols-6 gap-4 mt-24">
                <div className="size-24 mx-auto mb-4 col-span-1">
                  <DotLottieReact src="/assets/lottie/Speaker.lottie" autoplay loop />
                </div>

                <div className="col-span-3">
                  <Question
                    isLoading={isGeneratingQuestions}
                    question={questions?.[currentQuestionIndex]}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={questions?.length || 0}
                    onSpeakingChange={setIsTextToSpeechSpeaking}
                    role={role || ""}
                    allowSpeech={!isIntroducing}
                  />
                </div>
                <div className="col-span-2">
                  <CodeView
                    isLoading={isGeneratingQuestions}
                    supplement={questions?.[currentQuestionIndex]?.supplement || null}
                  />
                </div>
              </div>
            </>
          )}

          <Footer
            isLoading={isGeneratingQuestions}
            disabled={isStartingAttempt || isTextToSpeechSpeaking}
            question_attempt_id={questionAttemptResponse?.questionAttemptId}
            followUpStrategy={questions?.[currentQuestionIndex]?.followUpStrategy ?? null}
            isCurrentQuestionFollowUp={questions?.[currentQuestionIndex]?.isFollowUp ?? false}
            onNext={handleNextQuestion}
            isLastQuestion={questions && currentQuestionIndex === questions.length - 1}
            onSubmit={handleInterviewSubmit}
            onFollowUpQuestion={handleFollowUpQuestion}
          />
        </div>
      )}
    </div>
  );
};

const IntroductionSpeaker = ({
  onFinished,
  onSpeakingChange,
}: {
  onFinished: () => void;
  onSpeakingChange: (s: boolean) => void;
}) => {
  const [hasSpoken, setHasSpoken] = useState(false);

  const voiceId =
    typeof window !== "undefined"
      ? localStorage.getItem(TTS_VOICE_STORAGE_KEY) || DEFAULT_TTS_VOICE_ID
      : DEFAULT_TTS_VOICE_ID;

  const selectedVoice = TTS_VOICE_OPTIONS.find((v) => v.id === voiceId) || TTS_VOICE_OPTIONS[0];

  const nameMatch = selectedVoice.name.match(/^([^\s]+)/);

  const voiceName = nameMatch ? nameMatch[1] : selectedVoice.name;

  const introductionText = `Hi. My name is ${voiceName}. I will be taking your interview today. Let's begin.`;

  const { isSpeaking } = useTextToSpeech({
    text: introductionText,
    disabled: false,
  });

  useEffect(() => {
    onSpeakingChange(isSpeaking);

    if (isSpeaking) {
      setHasSpoken(true);
      return;
    }

    if (hasSpoken) {
      const timer = setTimeout(() => {
        onFinished();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isSpeaking, hasSpoken, onFinished, onSpeakingChange]);

  return null;
};

const UserIntroductionSpeaker = ({
  onSpeakingChange,
}: {
  onSpeakingChange: (s: boolean) => void;
}) => {
  const { isSpeaking } = useTextToSpeech({
    text: "Before we begin, please introduce yourself briefly.",
    disabled: false,
  });

  useEffect(() => {
    onSpeakingChange(isSpeaking);
  }, [isSpeaking]);

  return null;
};

const SuspendedInterviewPage = () => {
  return (
    <>
      <InterviewPage />
    </>
  );
};

export default SuspendedInterviewPage;
