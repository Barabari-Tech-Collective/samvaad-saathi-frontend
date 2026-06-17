"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { ROLE_OPTIONS } from "@/lib/constants";
import { trackDifficultySelected, trackRoleSelected } from "@/lib/posthog/tracking.utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface CreatePronunciationPracticeRequest {
  difficulty: string;
  role: string;
}

interface Word {
  index: number;
  word: string;
  phonetic: string;
}

interface CreatePronunciationPracticeResponse {
  practiceId: number;
  difficulty: string;
  words: Word[];
  totalWords: number;
  status: string;
  createdAt: string;
}

// ============================================================================
// Constants
// ============================================================================

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

const SESSION_STORAGE_KEY = "pronunciationPracticeData";

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
  const roleParam = searchParams.get("role");
  const difficultyParam = searchParams.get("difficulty");

  const [selectedRole, setSelectedRole] = useState(roleParam || "");
  const [difficulty, setDifficulty] = useState(difficultyParam || "");

  const router = useRouter();
  const hasAutoStarted = useRef(false);

  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const storePracticeDataAndNavigate = (data: CreatePronunciationPracticeResponse) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    router.push("/pronunciation-practice/start");
  };

  const { mutateAsync: createPronunciationPractice, isPending: isCreating } = apiClient.useMutation<
    CreatePronunciationPracticeResponse,
    CreatePronunciationPracticeRequest
  >({
    url: ENDPOINTS_V2.CREATE_PRONUNCIATION_PRACTICE,
    method: "post",
    successMessage: "Practice session created successfully!",
    errorMessage: "Failed to create practice session. Please try again.",
    options: {
      onSuccess: storePracticeDataAndNavigate,
    },
  });

  // Auto-start practice if both role and difficulty are provided in URL params
  useEffect(() => {
    if (roleParam && difficultyParam && !hasAutoStarted.current) {
      hasAutoStarted.current = true;

      createPronunciationPractice({
        difficulty: difficultyParam,
        role: roleParam,
      });
    }
  }, [roleParam, difficultyParam]);

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    trackRoleSelected(role);
  };

  const handleDifficultyChange = (level: string) => {
    setDifficulty(level);
    trackDifficultySelected(level);
  };

  const handleGetStarted = async () => {
    if (!selectedRole || !difficulty) return;

    try {
      await createPronunciationPractice({
        difficulty,
        role: selectedRole,
      });
    } catch (error) {
      console.error("Error creating pronunciation practice:", error);
    }
  };

  const isFormValid = selectedRole && difficulty;
  const isSubmitDisabled = !isFormValid || isCreating;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">Role</label>
        <select
          value={selectedRole}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="select select-bordered w-full"
        >
          <option value="" disabled>
            Select a role
          </option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Difficulty Level */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-black">Difficulty Level</label>
        <p className="text-sm text-gray-600">Choose a difficulty level</p>

        <div className="grid grid-cols-2 gap-3">
          {DIFFICULTY_LEVELS.map((level) => {
            const isSelected = difficulty === level.key;
            const buttonClass = isSelected
              ? level.activeClass
              : `${level.baseClass} ${level.hoverClass}`;

            return (
              <button
                key={level.key}
                type="button"
                onClick={() => handleDifficultyChange(level.key)}
                className={`px-4 py-3 rounded-lg text-sm font-medium text-black transition-all ${buttonClass} ${
                  level.fullWidth ? "col-span-2" : ""
                }`}
              >
                {level.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Get Started Button */}
      <div className="pt-4 mt-auto">
        <button
          type="button"
          onClick={handleGetStarted}
          disabled={isSubmitDisabled}
          className="btn btn-neutral btn-block btn-lg"
        >
          {isCreating ? "Starting..." : "Get Started"}
        </button>
      </div>
    </div>
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
