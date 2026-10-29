"use client";

import SkillLanding from "@/components/studio/SkillLanding";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { trackDifficultySelected } from "@/lib/posthog/tracking.utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import {
  PRONUNCIATION_STORAGE_KEY,
  PRONUNCIATION_DIFFICULTIES,
  validatePronunciationSession,
  type PronunciationPracticeData,
} from "@/lib/pronunciation-session";

const DIFFICULTY_LEVELS = [
  {
    key: "easy",
    label: "Easy",
    baseClass: "bg-yellow-100",
    activeClass: "bg-yellow-200 outline outline-2 outline-yellow-400",
    hoverClass: "hover:bg-yellow-200",
    fullWidth: false,
  },
  {
    key: "medium",
    label: "Medium",
    baseClass: "bg-purple-100",
    activeClass: "bg-purple-200 outline outline-2 outline-purple-400",
    hoverClass: "hover:bg-purple-200",
    fullWidth: false,
  },
  {
    key: "hard",
    label: "Hard",
    baseClass: "bg-pink-100",
    activeClass: "bg-pink-200 outline outline-2 outline-pink-400",
    hoverClass: "hover:bg-pink-200",
    fullWidth: true,
  },
] as const;

// ============================================================================
// Loading Component
// ============================================================================

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
    <span className="loading loading-spinner loading-lg text-primary" />
    <p className="text-sm text-gray-600">Starting practice session...</p>
  </div>
);

// ============================================================================
// Main Content Component
// ============================================================================

const PronunciationPracticeContent = () => {
  const searchParams = useSearchParams();
  const difficultyParam = searchParams.get("difficulty");
  const [difficulty, setDifficulty] = useState(
    PRONUNCIATION_DIFFICULTIES.find((level) => level === difficultyParam) ?? ""
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingSession = useRef<PronunciationPracticeData | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const router = useRouter();
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);
  const { mutateAsync: createPronunciationPractice } = apiClient.useMutation<
    PronunciationPracticeData,
    { difficulty: string }
  >({
    url: ENDPOINTS_V2.CREATE_PRONUNCIATION_PRACTICE,
    method: "post",
    errorMessage: "Could not start practice. Please try again.",
  });

  const handleDifficultyChange = (level: string) => {
    setDifficulty(level);
    trackDifficultySelected(level);
  };

  const handleGetStarted = async () => {
    if (!PRONUNCIATION_DIFFICULTIES.some((level) => level === difficulty) || inFlight.current)
      return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      // Check storage before creating a session. If saving fails after creation,
      // retain the result so retrying does not create another session.
      sessionStorage.setItem("pronunciation-storage-check", "1");
      sessionStorage.removeItem("pronunciation-storage-check");
      if (!pendingSession.current) {
        const data = await createPronunciationPractice({ difficulty });
        if (!mounted.current) return;
        pendingSession.current = validatePronunciationSession(data);
        if (!pendingSession.current) throw new Error("invalid-session");
      }
      sessionStorage.setItem(PRONUNCIATION_STORAGE_KEY, JSON.stringify(pendingSession.current));
      router.push("/pronunciation-practice/start");
    } catch {
      if (mounted.current)
        setError(
          pendingSession.current
            ? "Your practice is ready, but this browser could not save it. Free some browser storage, then select Continue practice."
            : "We could not open practice. Check your connection and allow browser storage, then try again."
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const isSubmitDisabled = !difficulty || busy;

  return (
    <SkillLanding
      title="Say it with clarity."
      eyebrow="Pronunciation"
      description="Listen to interview vocabulary, then practise saying it aloud. Choose a level to begin."
      steps={[
        {
          title: "Choose a level",
          description: "Choose the difficulty you want to work on.",
        },
        {
          title: "Listen, then speak",
          description:
            "Hear each word, then say it aloud. This drill does not record or score your voice.",
        },
        {
          title: "Keep refining",
          description: "Slow down the audio and repeat words at your own pace.",
        },
      ]}
    >
      <div className="studio-stack">
        {/* Difficulty Level */}
        <fieldset className="space-y-3">
          <legend className="block text-sm font-medium text-black">Difficulty level</legend>
          <p className="text-sm text-gray-600">Choose a difficulty level</p>

          <div className="grid grid-cols-2 gap-3">
            {DIFFICULTY_LEVELS.map((level) => {
              const isSelected = difficulty === level.key;

              return (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => handleDifficultyChange(level.key)}
                  disabled={busy || !!pendingSession.current}
                  aria-pressed={isSelected}
                  className={`studio-choice ${level.fullWidth ? "col-span-2" : ""}`}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {/* Get Started Button */}
        <div className="pt-4 mt-auto">
          <button
            type="button"
            onClick={handleGetStarted}
            disabled={isSubmitDisabled}
            className="btn btn-neutral btn-block btn-lg"
          >
            {busy ? "Starting..." : pendingSession.current ? "Continue practice" : "Start practice"}
          </button>
        </div>
      </div>
    </SkillLanding>
  );
};

// ============================================================================
// Page Component with Suspense
// ============================================================================

const PronunciationPracticePage = () => {
  return (
    <Suspense fallback={<LoadingState />}>
      <PronunciationPracticeContent />
    </Suspense>
  );
};

export default PronunciationPracticePage;
