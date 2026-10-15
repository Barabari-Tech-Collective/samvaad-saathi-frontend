"use client";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MicPermissionModal, useMicPermission } from "@/hooks/useMicPermission";
import {
  ProctoringPreflightModal,
  ProctoringTerminatedOverlay,
  useProctoring,
} from "@/hooks/useProctoring";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useQuestionAttempt } from "@/hooks/useQuestionAttempt";
import { useInterviewSessionLease } from "@/hooks/useInterviewSessionLease";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService, APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS, ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import {
  DEFAULT_TTS_VOICE_ID,
  TTS_VOICE_OPTIONS,
  TTS_VOICE_STORAGE_KEY,
  ROLE_OPTIONS,
  FULL_STACK_ROLE,
} from "@/lib/constants";
import {
  clearInterviewQuestions,
  getInterviewQuestions,
  setInterviewQuestions,
} from "@/lib/interview-session-storage";
import { getSessionLeaseErrorCode } from "@/lib/interview-session-lease";
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
  const interviewModeParam = searchParams.get("interviewMode");

  const [hasStarted, setHasStarted] = useState(false);
  const [isIntroducing, setIsIntroducing] = useState(false);
  const [isUserIntroducing, setIsUserIntroducing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [questions, setQuestions] = useState<GenerateQuestionsResponse["items"]>([]);
  const [isTextToSpeechSpeaking, setIsTextToSpeechSpeaking] = useState(false);
  // Separate from isTextToSpeechSpeaking: true while the question audio is
  // being fetched, before it's actually playing. Kept distinct rather than
  // folded into the speaking flag because isTextToSpeechSpeaking also drives
  // the Speaker avatar's loop={...} animation, which should only run once
  // audio is actually audible, not during the fetch/load itself.
  const [isTextToSpeechPreparing, setIsTextToSpeechPreparing] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const questionStartTimeRef = useRef<number>(0);
  const [lastTrackedIndex, setLastTrackedIndex] = useState<number>(-1);
  // Only set by the resume response, which is the one case where the URL
  // param alone isn't reliable - continuing an existing sitting never goes
  // through interview-start, so there's no fresh creation response to read it
  // from.
  const [resumedInterviewMode, setResumedInterviewMode] = useState<
    "practice" | "assessment" | null
  >(null);

  // Fresh creation carries interviewMode in the URL (see interview-start);
  // a resumed sitting is resolved by the resume response below. Unknown mode
  // defaults to Practice so proctoring is never applied by accident.
  const interviewModeValue: "practice" | "assessment" =
    resumedInterviewMode ?? (interviewModeParam === "assessment" ? "assessment" : "practice");
  const numericInterviewId = interviewId ? Number(interviewId) : null;
  const leaseEnabled =
    interviewModeValue === "practice" &&
    Number.isSafeInteger(numericInterviewId) &&
    Number(numericInterviewId) > 0 &&
    (!resumed || resumedInterviewMode !== null);
  const sessionLease = useInterviewSessionLease({
    interviewId: numericInterviewId,
    enabled: leaseEnabled,
  });

  const showCodeView = role
    ? ROLE_OPTIONS.includes(role as any) && role !== FULL_STACK_ROLE
    : false;

  // mic permission utils
  const { hasPermission, showModal, requestPermission, hidePermissionModal, showPermissionModal } =
    useMicPermission();

  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);
  const interviewsV1Client = createApiClient(APIService.INTERVIEWS);

  const {
    mutateAsync: generateQuestions,
    isPending: isGeneratingQuestions,
    data: generatedQuestions,
    error: generateQuestionsError,
  } = apiClient.useMutation<GenerateQuestionsResponse>({
    url: ENDPOINTS_V2.GENERATE_QUESTIONS,
    method: "post",
    errorMessage: "Something went wrong generating your interview questions. Please try again.",
  });

  const { mutateAsync: startQuestionAttempt } = apiClient.useMutation<StartQuestionAttemptResponse>(
    {
      url: ENDPOINTS.INTERVIEWS.START_QUESTION_ATTEMPT,
      method: "post",
      config: { timeout: 20_000 },
    }
  );
  const attempt = useQuestionAttempt(
    Number(interviewId),
    questions[currentQuestionIndex]?.interviewQuestionId,
    startQuestionAttempt,
    questions[currentQuestionIndex]?.questionAttemptId,
    sessionLease.token,
    interviewModeValue === "assessment" || sessionLease.canWrite,
    sessionLease.markConflict
  );

  const { mutateAsync: reportProctoringViolation } = interviewsV1Client.useMutation<
    unknown,
    { interviewId: number; reason: "tab_switch" | "fullscreen_exit" }
  >({
    url: ENDPOINTS.INTERVIEWS.PROCTORING_VIOLATION,
    method: "post",
  });
  const { mutateAsync: pauseInterview } = interviewsV1Client.useMutation<
    { interviewId: number; status: "paused"; pausedAt?: string; expiresAt?: string },
    { interviewId: number; sessionLeaseToken?: string }
  >({
    url: ENDPOINTS.INTERVIEWS.PAUSE,
    method: "post",
  });

  const proctoring = useProctoring({
    enabled: interviewModeValue === "assessment",
    interviewId: interviewId ? Number(interviewId) : null,
    reportViolation: reportProctoringViolation,
    onTerminated: () => {
      setHasStarted(false);
    },
  });

  interface ResumeInterviewResponse {
    interviewId: number;
    track: string;
    difficulty: string;
    questions: GenerateQuestionsResponse["items"];
    totalQuestions: number;
    attemptedQuestions: number;
    remainingQuestions: number;
    answeredQuestions: number;
    resumeQuestionIndex: number | null;
    status: string;
    interviewMode?: "practice" | "assessment";
  }
  const { mutateAsync: resumeInterview, isPending: isResuming } = interviewsV1Client.useMutation<
    ResumeInterviewResponse,
    { interviewId: number }
  >({
    url: ENDPOINTS.INTERVIEWS.RESUME_INTERVIEW,
    method: "post",
  });

  // The single point every pendingStart resolution goes through. A plain
  // "setHasStarted(true)" at each site - which is what this replaced - was
  // how an assessment's proctoring lock could be skipped entirely: whichever
  // effect happened to resolve pendingStart first just started the interview,
  // with no gate in between. mode is passed explicitly per call site because
  // the resume response and the generate response can each know their own
  // mode before interviewModeValue's state has re-rendered to reflect it.
  const finishStart = (mode: "practice" | "assessment") => {
    if (mode === "assessment" && !proctoring.isActive) {
      proctoring.openPreflight();
      // pendingStart stays true; handleBeginProctoredSession finishes this
      // once the student accepts the preflight and fullscreen engages.
      return;
    }
    setHasStarted(true);
    setIsIntroducing(!resumed);
    if (resumed) setIsUserIntroducing(false);
    setPendingStart(false);
  };

  // Read questions from session storage when resumed or reattempt
  useEffect(() => {
    if (!interviewId || (!resumed && !reattempt)) return;
    const id = Number(interviewId);
    const stored = getInterviewQuestions(id);
    if (resumed) {
      setResumeError(null);
      resumeInterview({ interviewId: id })
        .then((response) => {
          if (response.status === "completed") {
            router.replace(`/interview-completed?interviewId=${id}&role=${role || "Interview"}`);
            return;
          }
          if (response.status !== "active") {
            setResumeError("This interview has ended and cannot be resumed.");
            return;
          }
          setInterviewQuestions(response.interviewId, response.questions);
          setQuestions(response.questions);
          setCurrentQuestionIndex(
            response.resumeQuestionIndex ?? Math.max(0, response.questions.length - 1)
          );
          const mode = response.interviewMode === "assessment" ? "assessment" : "practice";
          setResumedInterviewMode(mode);
          if (pendingStart) {
            finishStart(mode);
          }
        })
        .catch((error: unknown) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 410) {
            setResumeError("This saved interview has expired. Start a new practice interview.");
            return;
          }
          if (Array.isArray(stored) && stored.length > 0) {
            setQuestions(stored as GenerateQuestionsResponse["items"]);
            setResumeError(
              "We could not confirm your latest saved answer. You can review the cached questions, but reconnect before answering."
            );
          } else {
            setResumeError(
              "We could not restore this interview. Check your connection and try again."
            );
          }
        });
      return;
    }
    if (Array.isArray(stored) && stored.length > 0) {
      setQuestions(stored as GenerateQuestionsResponse["items"]);
      if (pendingStart) finishStart(interviewModeValue);
      return;
    }
    if (reattempt) {
      router.push(
        `/reattempt-interview?interviewId=${interviewId}&role=${encodeURIComponent(role || "")}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          finishStart(interviewModeValue);
        }
      }
    } catch (error) {
      // Handle URL parsing error silently
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestionsParam, pendingStart, resumed, reattempt]);

  // Update local questions state when generatedQuestions changes
  useEffect(() => {
    if (generatedQuestions?.items && generatedQuestions.items.length > 0) {
      setQuestions(generatedQuestions.items);
      // Start interview if user has clicked the start button
      if (pendingStart) {
        const mode = generatedQuestions.interviewMode === "assessment" ? "assessment" : "practice";
        finishStart(mode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedQuestions?.items, pendingStart]);

  // Use current question id so we don't re-run when questions array reference changes (e.g. when adding follow-up)
  const currentQuestionId = questions?.[currentQuestionIndex]?.interviewQuestionId;

  useEffect(() => {
    if (currentQuestionId && interviewId) {
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
  }, [interviewId, currentQuestionIndex, currentQuestionId]);

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
      !generatedQuestions &&
      !generateQuestionsError
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
    generateQuestionsError,
    useResume,
    generateQuestions,
  ]);

  const handleInterviewStart = () => {
    if (hasPermission) {
      // If questions are currently generating, set pendingStart so it starts once ready
      if (isGeneratingQuestions) {
        setPendingStart(true);
      } else if (questions.length > 0) {
        finishStart(interviewModeValue);
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
        finishStart(interviewModeValue);
      } else {
        setPendingStart(true);
        generateQuestions({
          useResume: useResume === "true",
        });
      }
    }
    return granted;
  };

  const handleBeginProctoredSession = async () => {
    await proctoring.beginProctoredSession();
    setHasStarted(true);
    setIsIntroducing(true);
    setPendingStart(false);
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

      // Enforce the 7 question limit for Full Stack Role on the frontend
      // by popping the last unasked base question if we add a follow-up.
      if (role === "Full Stack Developer" && newQuestions.length > 7) {
        let lastUnaskedBaseIndex = -1;
        // Search backwards for the last base question
        for (let i = newQuestions.length - 1; i > currentQuestionIndex + 1; i--) {
          if (!newQuestions[i].isFollowUp) {
            lastUnaskedBaseIndex = i;
            break;
          }
        }
        if (lastUnaskedBaseIndex !== -1) {
          newQuestions.splice(lastUnaskedBaseIndex, 1);
        }
      }

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
        sessionLease.clear();
        router.push(`/interview-completed?interviewId=${interviewId}&role=${role || "Interview"}`);
      },
    },
  });

  const handleInterviewSubmit = async () => {
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

      try {
        await completeInterview({
          interviewId: Number(interviewId),
          ...(sessionLease.token ? { sessionLeaseToken: sessionLease.token } : {}),
        });
      } catch (error) {
        if (getSessionLeaseErrorCode(error)) sessionLease.markConflict();
        throw error;
      }
    }
  };

  const handleSaveAndExit = async () => {
    if (!interviewId || interviewModeValue !== "practice") return;
    try {
      await pauseInterview({
        interviewId: Number(interviewId),
        ...(sessionLease.token ? { sessionLeaseToken: sessionLease.token } : {}),
      });
    } catch (error) {
      if (getSessionLeaseErrorCode(error)) sessionLease.markConflict();
      throw error;
    }
    sessionLease.clear();
    sessionStorage.removeItem(`interviewEndTime_${interviewId}`);
    trackEvent("interview_paused", { interview_id: interviewId });
    router.push("/practice?interviewPaused=true");
  };

  return (
    <div className="px-8 pt-4">
      <ProctoringPreflightModal
        isOpen={proctoring.showPreflight}
        onBegin={handleBeginProctoredSession}
        onCancel={proctoring.closePreflight}
      />
      {proctoring.isTerminated && (
        <ProctoringTerminatedOverlay
          reason={proctoring.terminationReason}
          onLeave={() => router.push("/home")}
        />
      )}
      {leaseEnabled && sessionLease.status === "conflict" && (
        <dialog open className="modal modal-open" aria-labelledby="session-conflict-title">
          <div className="modal-box">
            <h2 id="session-conflict-title" className="text-xl font-bold">
              This interview is open somewhere else
            </h2>
            <p className="py-4 text-slate-700">
              To protect your answers, only one device or browser tab can edit a Practice interview
              at a time. Continuing here will immediately stop the other session from saving.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  trackEvent("interview_session_conflict_exit", { interview_id: interviewId });
                  router.push("/practice");
                }}
              >
                Go back
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  trackEvent("interview_session_takeover", { interview_id: interviewId });
                  void sessionLease.takeOver();
                }}
              >
                Continue on this device
              </button>
            </div>
          </div>
        </dialog>
      )}
      {leaseEnabled && ["reconnecting", "error"].includes(sessionLease.status) && (
        <div
          role="alert"
          className="mx-auto mb-4 max-w-2xl rounded-xl bg-amber-50 p-4 text-center text-amber-900"
        >
          <p>
            We cannot safely save answers until this interview reconnects. Your current draft stays
            on this device.
          </p>
          <button
            className="btn btn-sm mt-3"
            onClick={() => {
              trackEvent("interview_session_reconnect", { interview_id: interviewId });
              void sessionLease.retry();
            }}
          >
            Reconnect
          </button>
        </div>
      )}
      {!hasStarted ? (
        <>
          {resumeError && (
            <div role="alert" className="mx-auto mb-4 max-w-2xl text-center text-red-700">
              <p>{resumeError}</p>
              <button className="btn btn-outline mt-3" onClick={() => window.location.reload()}>
                Try restoring again
              </button>
            </div>
          )}
          <Welcome
            role={role || ""}
            onInterviewStart={handleInterviewStart}
            isPreparing={
              isGeneratingQuestions ||
              isResuming ||
              (leaseEnabled && sessionLease.status === "acquiring")
            }
            blocked={Boolean(resumeError) || (leaseEnabled && !sessionLease.canWrite)}
            mode={interviewModeValue}
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
            onPreparingChange={setIsTextToSpeechPreparing}
          />
        </div>
      ) : isUserIntroducing ? (
        <div>
          <Header
            role={role || ""}
            hasStarted={hasStarted}
            interviewId={interviewId}
            onTimerExpire={() => setTimerExpired(true)}
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

            <UserIntroductionSpeaker
              onSpeakingChange={setIsTextToSpeechSpeaking}
              onPreparingChange={setIsTextToSpeechPreparing}
            />

            <div className="w-full mt-4">
              <Footer
                key="introduction"
                timerExpired={timerExpired}
                onSubmit={handleInterviewSubmit}
                disabled={
                  isTextToSpeechSpeaking ||
                  isTextToSpeechPreparing ||
                  (leaseEnabled && !sessionLease.canWrite)
                }
                onNext={() => setIsUserIntroducing(false)}
                isIntroStep={true}
                onSaveAndExit={interviewModeValue === "practice" ? handleSaveAndExit : undefined}
                sessionLeaseToken={sessionLease.token}
                onSessionConflict={sessionLease.markConflict}
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
            onTimerExpire={() => setTimerExpired(true)}
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
                onPreparingChange={setIsTextToSpeechPreparing}
                role={role || ""}
                allowSpeech={!isIntroducing}
              />
              {showCodeView && (
                <CodeView
                  isLoading={isGeneratingQuestions}
                  supplement={questions?.[currentQuestionIndex]?.supplement || null}
                />
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-6 gap-4 mt-24">
                <div className="size-24 mx-auto mb-4 col-span-1">
                  <DotLottieReact src="/assets/lottie/Speaker.lottie" autoplay loop />
                </div>

                <div className={!showCodeView ? "col-span-5" : "col-span-3"}>
                  <Question
                    isLoading={isGeneratingQuestions}
                    question={questions?.[currentQuestionIndex]}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={questions?.length || 0}
                    onSpeakingChange={setIsTextToSpeechSpeaking}
                    onPreparingChange={setIsTextToSpeechPreparing}
                    role={role || ""}
                    allowSpeech={!isIntroducing}
                  />
                </div>
                {showCodeView && (
                  <div className="col-span-2">
                    <CodeView
                      isLoading={isGeneratingQuestions}
                      supplement={questions?.[currentQuestionIndex]?.supplement || null}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {attempt.failed && (
            <div role="alert" className="my-4 text-center text-red-700">
              We could not prepare this question for saving. Select Retry question before recording.
              <button
                className="btn btn-outline ml-3"
                disabled={attempt.pending || timerExpired}
                onClick={() => void attempt.retry()}
              >
                Retry question
              </button>
            </div>
          )}
          {attempt.pending && (
            <p role="status" className="text-center">
              Preparing your answer. If this takes too long, a retry option will appear.
            </p>
          )}
          <Footer
            key={`${interviewId}:${currentQuestionId}`}
            timerExpired={timerExpired}
            isLoading={isGeneratingQuestions}
            disabled={
              attempt.pending ||
              isTextToSpeechSpeaking ||
              isTextToSpeechPreparing ||
              !attempt.id ||
              (leaseEnabled && !sessionLease.canWrite)
            }
            question_attempt_id={attempt.id}
            initiallyAnswered={questions?.[currentQuestionIndex]?.answerSaved === true}
            followUpStrategy={questions?.[currentQuestionIndex]?.followUpStrategy ?? null}
            isCurrentQuestionFollowUp={questions?.[currentQuestionIndex]?.isFollowUp ?? false}
            onNext={handleNextQuestion}
            isLastQuestion={questions && currentQuestionIndex === questions.length - 1}
            onSubmit={handleInterviewSubmit}
            onFollowUpQuestion={handleFollowUpQuestion}
            onSaveAndExit={interviewModeValue === "practice" ? handleSaveAndExit : undefined}
            sessionLeaseToken={sessionLease.token}
            onSessionConflict={sessionLease.markConflict}
          />
        </div>
      )}
    </div>
  );
};

const IntroductionSpeaker = ({
  onFinished,
  onSpeakingChange,
  onPreparingChange,
}: {
  onFinished: () => void;
  onSpeakingChange: (s: boolean) => void;
  onPreparingChange?: (p: boolean) => void;
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

  const { isSpeaking, isPreparing } = useTextToSpeech({
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

  useEffect(() => {
    onPreparingChange?.(isPreparing);
  }, [isPreparing, onPreparingChange]);

  return null;
};

const UserIntroductionSpeaker = ({
  onSpeakingChange,
  onPreparingChange,
}: {
  onSpeakingChange: (s: boolean) => void;
  onPreparingChange?: (p: boolean) => void;
}) => {
  const { isSpeaking, isPreparing } = useTextToSpeech({
    text: "Before we begin, please introduce yourself briefly.",
    disabled: false,
  });

  useEffect(() => {
    onSpeakingChange(isSpeaking);
  }, [isSpeaking, onSpeakingChange]);

  useEffect(() => {
    onPreparingChange?.(isPreparing);
  }, [isPreparing, onPreparingChange]);

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
