"use client";

import { useCompanionPreferences } from "@/hooks/useCompanionPreferences";
import { useViewLifetime } from "@/hooks/useViewLifetime";
import { validInterviewId } from "@/lib/interview-history";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { MicPermissionModal, useMicPermission } from "@/hooks/useMicPermission";
import {
  ProctoringPreflightModal,
  AssessmentInterruptionNotice,
  useProctoring,
} from "@/hooks/useProctoring";
import { resolveStoredTtsVoiceId, useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useQuestionAttempt } from "@/hooks/useQuestionAttempt";
import { useInterviewSessionLease } from "@/hooks/useInterviewSessionLease";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService, APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS, ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { TTS_VOICE_OPTIONS, ROLE_OPTIONS, FULL_STACK_ROLE } from "@/lib/constants";
import { getSessionLeaseErrorCode } from "@/lib/interview-session-lease";
import { trackEvent, trackInterviewQuestionView } from "@/lib/posthog/tracking.utils";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CodeView, Footer, Header, Question, Welcome } from "./_components";
import {
  type AdvanceInterviewAction,
  type FollowUpQuestion,
  type GenerateQuestionsResponse,
  type PracticeNavigationResponse,
  type ResumeInterviewResponse,
  type StartQuestionAttemptResponse,
} from "./types";

const InterviewPage = () => {
  const router = useRouter();
  const lifetime = useViewLifetime();
  const requireCurrentView = lifetime.requireCurrent;
  const { user, loading: loadingIdentity } = useAuth();
  const companion = useCompanionPreferences(user?.userId ? String(user.userId) : null);

  const searchParams = useSearchParams();
  const interviewId = searchParams.get("interviewId");
  const useResume = searchParams.get("useResume");
  const role = searchParams.get("role");
  const selectedQuestionsParam = searchParams.get("selectedQuestions");
  const resumed = searchParams.get("resumed") === "true" || selectedQuestionsParam !== null;
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
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState<number | null>(null);
  const [completeReady, setCompleteReady] = useState(false);
  const [plannedQuestionCount, setPlannedQuestionCount] = useState<number | null>(null);
  const plannedCountRef = useRef<number | null>(null);
  const [answerDeadlineAt, setAnswerDeadlineAt] = useState<string | null | undefined>(undefined);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
  const stateVersionRef = useRef<number | null>(null);
  const transitionRef = useRef<{ signature: string; id: string } | null>(null);
  const generationSyncRef = useRef<{ interviewId: number; pending: boolean } | null>(null);
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
    ? ROLE_OPTIONS.some((option) => option === role) && role !== FULL_STACK_ROLE
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
    config: lifetime.requestConfig,
    showToastError: false,
    options: { retry: false },
  });

  const { mutateAsync: startQuestionAttempt } = apiClient.useMutation<StartQuestionAttemptResponse>(
    {
      url: ENDPOINTS.INTERVIEWS.START_QUESTION_ATTEMPT,
      method: "post",
      config: { ...lifetime.requestConfig, timeout: 20_000 },
      showToastError: false,
    }
  );
  const attempt = useQuestionAttempt(
    Number(interviewId),
    questions[currentQuestionIndex]?.interviewQuestionId,
    startQuestionAttempt,
    questions[currentQuestionIndex]?.questionAttemptId,
    sessionLease.token,
    hasStarted &&
      !isIntroducing &&
      !isUserIntroducing &&
      (interviewModeValue === "assessment" || sessionLease.canWrite),
    sessionLease.markConflict
  );

  const { mutateAsync: reportProctoringViolation } = interviewsV1Client.useMutation<
    unknown,
    { interviewId: number; reason: "tab_switch" | "fullscreen_exit"; eventId: string }
  >({
    url: ENDPOINTS.INTERVIEWS.PROCTORING_VIOLATION,
    method: "post",
    config: lifetime.requestConfig,
    showToastError: false,
    options: { retry: false },
  });
  const { mutateAsync: pauseInterview } = interviewsV1Client.useMutation<
    { interviewId: number; status: "paused"; pausedAt?: string; expiresAt?: string },
    { interviewId: number; sessionLeaseToken?: string }
  >({
    url: ENDPOINTS.INTERVIEWS.PAUSE,
    method: "post",
    config: lifetime.requestConfig,
    showToastError: false,
  });

  const proctoring = useProctoring({
    enabled:
      interviewModeValue === "assessment" && !loadingIdentity && !!user?.userId && !timerExpired,
    scopeKey: String(user?.userId ?? ""),
    interviewId: interviewId ? Number(interviewId) : null,
    reportViolation: reportProctoringViolation,
  });

  const { mutateAsync: resumeInterview, isPending: isResuming } = interviewsV1Client.useMutation<
    ResumeInterviewResponse,
    { interviewId: number }
  >({
    url: ENDPOINTS.INTERVIEWS.RESUME_INTERVIEW,
    method: "post",
    config: lifetime.requestConfig,
    showToastError: false,
  });
  const { mutateAsync: advanceInterview, isPending: isAdvancing } = interviewsV1Client.useMutation<
    PracticeNavigationResponse,
    {
      interviewId: number;
      fromQuestionId: number;
      expectedStateVersion: number;
      transitionId: string;
      action: AdvanceInterviewAction;
      answerVersion?: number;
      sessionLeaseToken?: string;
    }
  >({
    url: ENDPOINTS.INTERVIEWS.ADVANCE,
    method: "post",
    showToastError: false,
    config: { ...lifetime.requestConfig, timeout: 20_000 },
  });

  const { mutateAsync: beginFixedInterview } = interviewsV1Client.useMutation<
    { plannedQuestionCount: number | null; answerDeadlineAt: string | null; serverTime: string },
    { interviewId: number }
  >({
    url: "interviews/begin",
    method: "post",
    config: lifetime.requestConfig,
    showToastError: false,
  });

  const activatePreparedInterview = async () => {
    lifetime.requireCurrent();
    if (plannedCountRef.current !== null) {
      const started = await beginFixedInterview({ interviewId: Number(interviewId) });
      lifetime.requireCurrent();
      setAnswerDeadlineAt(started.answerDeadlineAt);
      setServerClockOffsetMs(Date.parse(started.serverTime) - Date.now());
    }
    setHasStarted(true);
    setIsIntroducing(plannedCountRef.current === null && !resumed);
    if (plannedCountRef.current !== null || resumed) setIsUserIntroducing(false);
    setPendingStart(false);
  };

  const applyCheckpoint = useCallback(
    (response: ResumeInterviewResponse | PracticeNavigationResponse) => {
      requireCurrentView();
      if (String(response.interviewId) !== interviewId || !Array.isArray(response.questions))
        throw new Error("The saved checkpoint belongs to another sitting or is incomplete.");
      if ("track" in response) {
        if (response.interviewMode !== "practice" && response.interviewMode !== "assessment")
          throw new Error("The saved purpose could not be verified.");
        setResumedInterviewMode(response.interviewMode);
      }
      setQuestions(response.questions);
      if (response.plannedQuestionCount !== undefined) {
        plannedCountRef.current = response.plannedQuestionCount;
        setPlannedQuestionCount(response.plannedQuestionCount);
      }
      const nextIndex =
        response.currentQuestionIndex ??
        (response.currentQuestionId === null ? Math.max(0, response.questions.length - 1) : 0);
      setCurrentQuestionIndex(nextIndex);
      stateVersionRef.current = response.stateVersion;
      setStateVersion(response.stateVersion);
      setCompleteReady(response.completeReady);
    },
    [interviewId, requireCurrentView]
  );

  // The single point every pendingStart resolution goes through. A plain
  // "setHasStarted(true)" at each site - which is what this replaced - was
  // how an assessment's proctoring lock could be skipped entirely: whichever
  // effect happened to resolve pendingStart first just started the interview,
  // with no gate in between. mode is passed explicitly per call site because
  // the resume response and the generate response can each know their own
  // mode before interviewModeValue's state has re-rendered to reflect it.
  const finishStart = (mode: "practice" | "assessment") => {
    if (!lifetime.isCurrent()) return;
    if (mode === "assessment" && !proctoring.isActive) {
      proctoring.openPreflight();
      // pendingStart stays true; handleBeginProctoredSession finishes this
      // once the student accepts the preflight and fullscreen engages.
      return;
    }
    void activatePreparedInterview().catch(() => {
      if (!lifetime.isCurrent()) return;
      setResumeError(
        "We could not start the prepared interview. Reconnect and try again; your questions remain saved."
      );
    });
  };

  // Read questions from session storage when resumed or reattempt
  useEffect(() => {
    if (!interviewId || (!resumed && !reattempt)) return;
    const id = Number(interviewId);

    if (resumed) {
      setResumeError(null);
      resumeInterview({ interviewId: id })
        .then((response) => {
          if (!lifetime.isCurrent()) return;
          if (response.interviewId !== id) throw new Error("Unexpected sitting checkpoint.");
          if (response.status === "completed") {
            router.replace(`/interview-completed?interviewId=${id}&role=${role || "Interview"}`);
            return;
          }
          if (response.status !== "active") {
            setResumeError("This interview has ended and cannot be resumed.");
            return;
          }
          applyCheckpoint(response);
          if (response.interviewMode !== "assessment" && response.interviewMode !== "practice")
            throw new Error("The saved interview purpose could not be verified.");
          const mode = response.interviewMode;
          setResumedInterviewMode(mode);
          if (pendingStart) {
            finishStart(mode);
          }
        })
        .catch((error: unknown) => {
          if (!lifetime.isCurrent()) return;
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 410) {
            setResumeError("This saved interview has expired. Start a new practice interview.");
            return;
          }
          setResumeError(
            "We could not verify this saved interview. Check your account, access and connection before restoring it again."
          );
        });
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyCheckpoint,
    interviewId,
    resumed,
    reattempt,
    pendingStart,
    role,
    router,
    resumeInterview,
  ]);

  // Update local questions state when generatedQuestions changes
  useEffect(() => {
    if (generatedQuestions?.items && generatedQuestions.items.length > 0) {
      const id = Number(interviewId ?? generatedQuestions.interviewId);
      if (generatedQuestions.interviewId !== id) {
        setResumeError("Prepared questions did not match this sitting. Restore it from History.");
        return;
      }
      if (
        generationSyncRef.current?.interviewId === id &&
        (generationSyncRef.current.pending || stateVersionRef.current !== null)
      )
        return;
      generationSyncRef.current = { interviewId: id, pending: true };
      setResumeError(null);
      resumeInterview({ interviewId: id })
        .then((response) => {
          if (!lifetime.isCurrent()) return;
          generationSyncRef.current = { interviewId: id, pending: false };
          applyCheckpoint(response);
          if (pendingStart) {
            const mode = response.interviewMode;
            if (mode !== "assessment" && mode !== "practice")
              throw new Error("The saved purpose could not be verified.");
            setResumedInterviewMode(mode);
            finishStart(mode);
          }
        })
        .catch(() => {
          if (!lifetime.isCurrent()) return;
          generationSyncRef.current = null;
          setResumeError(
            "Your questions were prepared, but we could not confirm the saved interview checkpoint. Check your connection and try again."
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedQuestions?.items, pendingStart, applyCheckpoint, interviewId, resumeInterview]);

  // Use current question id so we don't re-run when questions array reference changes (e.g. when adding follow-up)
  const currentQuestionId = questions?.[currentQuestionIndex]?.interviewQuestionId;

  const currentQuestionIsFollowUp = questions[currentQuestionIndex]?.isFollowUp === true;
  useEffect(() => {
    if (currentQuestionId && interviewId) {
      trackInterviewQuestionView(
        String(currentQuestionId),
        currentQuestionIndex + 1,
        currentQuestionIsFollowUp ? "follow-up" : "main",
        interviewId
      );
    }
  }, [interviewId, currentQuestionIndex, currentQuestionId, currentQuestionIsFollowUp]);
  useEffect(() => {
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
        interviewId: Number(interviewId),
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
    interviewId,
    generateQuestions,
  ]);

  const handleInterviewStart = () => {
    if (!lifetime.isCurrent()) return;
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
          interviewId: Number(interviewId),
          useResume: useResume === "true",
        });
      }
    } else {
      showPermissionModal();
    }
  };

  const handleRequestPermission = async () => {
    lifetime.requireCurrent();
    const granted = await requestPermission();
    if (!lifetime.isCurrent()) return false;
    if (granted) {
      if (isGeneratingQuestions) {
        setPendingStart(true);
      } else if (questions.length > 0) {
        finishStart(interviewModeValue);
      } else {
        setPendingStart(true);
        generateQuestions({
          interviewId: Number(interviewId),
          useResume: useResume === "true",
        });
      }
    }
    return granted;
  };

  const handleBeginProctoredSession = async () => {
    if (!(await proctoring.beginProctoredSession()) || !lifetime.isCurrent()) return;
    try {
      await activatePreparedInterview();
    } catch {
      if (!lifetime.isCurrent()) return;
      setResumeError(
        "The prepared assessment could not be started. Check your connection and saved session before trying again."
      );
    }
  };

  const runNavigation = async (
    action: AdvanceInterviewAction,
    answerVersion?: number
  ): Promise<PracticeNavigationResponse | null> => {
    lifetime.requireCurrent();
    if (interviewModeValue === "assessment" && plannedCountRef.current === null) {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((previous) => previous + 1);
      }
      return null;
    }
    const id = Number(interviewId);
    const current = questions[currentQuestionIndex];
    const version = stateVersionRef.current;
    if (!Number.isSafeInteger(id) || id <= 0 || !current || version === null) {
      setNavigationError(
        "We could not confirm your saved checkpoint. Restore the interview before continuing."
      );
      throw new Error("PRACTICE_CHECKPOINT_NOT_READY");
    }

    const signature = `${id}:${current.interviewQuestionId}:${version}:${action}:${answerVersion ?? 0}`;
    if (transitionRef.current?.signature !== signature) {
      const random =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      transitionRef.current = {
        signature,
        id: `nav-${id}-${random}`.slice(0, 64),
      };
    }

    setNavigationError(null);
    try {
      const response = await advanceInterview({
        interviewId: id,
        fromQuestionId: current.interviewQuestionId,
        expectedStateVersion: version,
        transitionId: transitionRef.current.id,
        action,
        ...(answerVersion !== undefined ? { answerVersion } : {}),
        ...(sessionLease.token ? { sessionLeaseToken: sessionLease.token } : {}),
      });
      lifetime.requireCurrent();
      transitionRef.current = null;
      applyCheckpoint(response);
      return response;
    } catch (error) {
      if (!lifetime.isCurrent()) return null;
      const detail = (
        error as {
          response?: { data?: { detail?: { code?: string; message?: string } } };
        }
      ).response?.data?.detail;
      const code = detail?.code;
      if (getSessionLeaseErrorCode(error)) sessionLease.markConflict();
      if (code === "INTERVIEW_STATE_CONFLICT" || code === "QUESTION_CHECKPOINT_CHANGED") {
        transitionRef.current = null;
        const checkpoint = await resumeInterview({ interviewId: id });
        lifetime.requireCurrent();
        applyCheckpoint(checkpoint);
        setNavigationError(
          "This interview moved in another tab. We restored the latest saved question; no answer was lost."
        );
        return null;
      }
      if (code === "FOLLOW_UP_PENDING") {
        setNavigationError(
          "Your answer is saved. The follow-up is still being prepared—wait a moment or choose Continue without follow-up."
        );
      } else if (detail?.message) {
        setNavigationError(detail.message);
      }
      throw error;
    }
  };

  const handleNextQuestion = async (action: AdvanceInterviewAction, answerVersion?: number) => {
    await runNavigation(action, answerVersion);
  };

  const handleFollowUpQuestion = (followUpQuestion: FollowUpQuestion) => {
    if (!lifetime.isCurrent()) return;
    if (plannedCountRef.current !== null) return;
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
      if (
        prev.some(
          (question) => question.interviewQuestionId === followUpQuestion.interviewQuestionId
        )
      )
        return prev;
      const newQuestions = [...prev];
      newQuestions.splice(currentQuestionIndex + 1, 0, transformedQuestion);
      return newQuestions;
    });
  };

  const { mutateAsync: completeInterview } = apiClient.useMutation({
    url: ENDPOINTS.INTERVIEWS.COMPLETE,
    method: "post",
    config: lifetime.requestConfig,
    showToastError: false,
    options: {
      onSuccess: () => {
        if (!lifetime.isCurrent()) return;
        if (interviewId) {
          try {
            sessionStorage.removeItem(`interviewEndTime_${interviewId}`);
          } catch {
            /* server receipt is authoritative */
          }
        }
        sessionLease.clear();
        router.push(`/interview-completed?interviewId=${interviewId}&role=${role || "Interview"}`);
      },
    },
  });

  const handleInterviewSubmit = async (
    action: AdvanceInterviewAction = "skip",
    answerVersion?: number
  ) => {
    lifetime.requireCurrent();
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
        if (
          (interviewModeValue === "practice" || plannedCountRef.current !== null) &&
          !completeReady &&
          !timerExpired
        ) {
          const transition = await runNavigation(action, answerVersion);
          // A conflict reloads the canonical checkpoint and intentionally
          // stops submission. If another question exists, the response has
          // already moved the UI there instead of completing prematurely.
          if (!transition?.completeReady) return;
        }
        lifetime.requireCurrent();
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
    lifetime.requireCurrent();
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
    lifetime.requireCurrent();
    sessionLease.clear();
    try {
      sessionStorage.removeItem(`interviewEndTime_${interviewId}`);
    } catch {
      /* optional client cache */
    }
    trackEvent("interview_paused", { interview_id: interviewId });
    router.push("/practice?interviewPaused=true");
  };

  return (
    <div className="studio-room">
      <ProctoringPreflightModal
        isOpen={proctoring.showPreflight}
        isStarting={proctoring.isBeginning}
        onBegin={handleBeginProctoredSession}
        onCancel={proctoring.closePreflight}
      />
      {proctoring.notice && (
        <AssessmentInterruptionNotice
          reason={proctoring.notice}
          reportState={proctoring.reportState}
          onRetry={() => {
            void proctoring.retryReport();
          }}
          onContinue={proctoring.acknowledge}
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
            {sessionLease.accessMessage ??
              "We cannot safely save answers until this interview reconnects. Your current draft stays on this device."}
          </p>
          <button
            className="btn btn-sm mt-3"
            onClick={() => {
              trackEvent("interview_session_reconnect", { interview_id: interviewId });
              void sessionLease.retry();
            }}
          >
            {sessionLease.accessMessage ? "Check enrollment again" : "Reconnect"}
          </button>
        </div>
      )}
      {navigationError && (
        <div
          role="status"
          className="mx-auto mb-4 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-950"
        >
          {navigationError}
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
            plannedQuestionCount={plannedQuestionCount}
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
            mode={interviewModeValue}
            role={role || ""}
            hasStarted={hasStarted}
            deadlineAt={answerDeadlineAt}
            serverClockOffsetMs={serverClockOffsetMs}
            interviewId={interviewId}
            onTimerExpire={() => setTimerExpired(true)}
          />

          <div className="flex flex-col items-center mt-12 max-w-4xl mx-auto px-4">
            <div className="w-full py-6">
              <div className="mb-2">
                <span className="text-lg text-slate-900 font-medium">
                  Microphone warm-up (unscored):
                </span>
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
                allowRerecord={interviewModeValue === "practice"}
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
            mode={interviewModeValue}
            role={role || ""}
            hasStarted={hasStarted}
            deadlineAt={answerDeadlineAt}
            serverClockOffsetMs={serverClockOffsetMs}
            interviewId={interviewId}
            onTimerExpire={() => setTimerExpired(true)}
          />

          <section
            aria-label="Current interview question"
            className={`mx-auto mt-6 grid max-w-6xl gap-5 ${showCodeView ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)]" : ""}`}
          >
            <div className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-white px-5 py-2 sm:px-8 sm:py-4">
              <p className="mt-4 text-sm font-medium text-[var(--brand-blue)]">
                {interviewModeValue === "practice"
                  ? "Practice interview"
                  : "Assessment · AI interviewer"}
              </p>
              <Question
                isLoading={isGeneratingQuestions}
                question={questions?.[currentQuestionIndex]}
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={plannedQuestionCount ?? (questions?.length || 0)}
                onSpeakingChange={setIsTextToSpeechSpeaking}
                onPreparingChange={setIsTextToSpeechPreparing}
                role={role || ""}
                allowSpeech={
                  !isIntroducing &&
                  (interviewModeValue === "assessment" ||
                    (companion.preferences.ready && !companion.preferences.muted))
                }
              />
            </div>
            {showCodeView && (
              <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white p-4">
                <CodeView
                  isLoading={isGeneratingQuestions}
                  supplement={questions?.[currentQuestionIndex]?.supplement || null}
                />
              </div>
            )}
          </section>

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
            allowRerecord={interviewModeValue === "practice"}
            key={`${interviewId}:${currentQuestionId}`}
            companion={
              interviewModeValue === "practice"
                ? {
                    ...companion,
                    blocked:
                      attempt.pending ||
                      isAdvancing ||
                      !attempt.id ||
                      stateVersion === null ||
                      (leaseEnabled && !sessionLease.canWrite),
                    speech: isTextToSpeechSpeaking
                      ? "speaking"
                      : isTextToSpeechPreparing
                        ? "preparing"
                        : "idle",
                  }
                : undefined
            }
            timerExpired={timerExpired}
            isLoading={isGeneratingQuestions}
            disabled={
              attempt.pending ||
              isAdvancing ||
              isTextToSpeechSpeaking ||
              isTextToSpeechPreparing ||
              !attempt.id ||
              (interviewModeValue === "practice" && stateVersion === null) ||
              (leaseEnabled && !sessionLease.canWrite)
            }
            question_attempt_id={attempt.id}
            initiallyAnswered={questions?.[currentQuestionIndex]?.answerSaved === true}
            initialAnswerVersion={questions?.[currentQuestionIndex]?.answerVersion ?? 0}
            initialTranscriptionStatus={
              questions?.[currentQuestionIndex]?.transcriptionStatus ?? null
            }
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

  const voiceId = resolveStoredTtsVoiceId();

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
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const id = params.get("interviewId");
  const mode = params.get("interviewMode");
  const restores = params.get("resumed") === "true" || params.has("selectedQuestions");
  const invalid =
    !validInterviewId(id) ||
    params.get("reattempt") === "true" ||
    (mode !== null && mode !== "practice" && mode !== "assessment") ||
    (mode === null && !restores);
  if (loading || !user?.userId || invalid)
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-bold text-[#1F285B]">
          {invalid ? "Restore this interview from History" : "Checking your interview account"}
        </h1>
        <p role="status">
          {invalid
            ? "This link cannot safely identify a current sitting and its purpose. Use History to continue a saved interview or set up fresh practice."
            : "Sign in to the account that owns this sitting before opening it."}
        </p>
        <Link
          className="inline-flex min-h-11 items-center text-[#344499] underline"
          href="/history"
        >
          View history
        </Link>
      </div>
    );
  return <InterviewPage key={JSON.stringify([String(user.userId), params.toString()])} />;
};

export default SuspendedInterviewPage;
