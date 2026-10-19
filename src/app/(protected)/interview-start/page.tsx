"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS, ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { ROLE_OPTIONS, FULL_STACK_ROLE } from "@/lib/constants";
import {
  DIFFICULTY_LEVEL,
  correctedDifficulty,
  isDifficultyOffered,
  isNonTechCategory,
  offeredDifficulties,
  unavailableDifficultyMessage,
} from "@/lib/interview-difficulty";
import { profilesForMode, type InterviewMode } from "@/lib/interview-mode";
import { setInterviewQuestions } from "@/lib/interview-session-storage";
import {
  trackDifficultySelected,
  trackEvent,
  trackResumeToggleClick,
  trackRoleSelected,
  trackStartInterviewButtonClick,
} from "@/lib/posthog/tracking.utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/auth-provider";
import PracticePreflight from "@/components/practice/PracticePreflight";

interface CreateInterviewRequest {
  clientContract: "fixed-round-v1";
  track: string;
  difficulty: string;
  jobProfileId?: number;
  questionCount?: number;
}

interface CreateInterviewResponse {
  plannedQuestionCount?: number | null;
  interviewId: string;
  /**
   * Snapshotted on the interview at creation - never re-read from the job
   * profile later. Passed through to /interview so it knows whether to
   * activate proctoring; the backend independently re-checks this same
   * stored value before actually ending an interview, so this being wrong
   * or stripped client-side cannot itself end an interview incorrectly -
   * worst case, proctoring simply doesn't activate.
   */
  interviewMode?: "practice" | "assessment";
}

interface JobProfile {
  questionsPerInterview?: number | null;
  id: number;
  title: string;
  description: string;
  category?: string;
  interviewMode?: InterviewMode;
  created_at: string;
  /**
   * Difficulties the facilitator has published enough questions for, easiest
   * first, as decided by the server.
   *
   * This picker used to offer all four levels unconditionally. If a facilitator
   * published only easy questions and a student picked medium, the backend
   * silently generated AI questions instead - so the student was assessed
   * against that facilitator's role on questions the facilitator had never
   * seen. The server now refuses that, and this field is how the picker avoids
   * offering a level that would be refused.
   *
   * Optional because free-practice roles have no job profile behind them; there
   * every level is available.
   */
  availableDifficulties?: string[];
}

interface JobProfilesResponse {
  items: JobProfile[];
  total: number;
}

interface GenerateNonTechRequest {
  clientContract: "fixed-round-v1";
  jobProfileId: number;
  difficulty: string;
  useResume: boolean;
}

interface GenerateNonTechResponse {
  plannedQuestionCount?: number | null;
  interviewId: number;
  track: string;
  interviewMode?: "practice" | "assessment";
  items: unknown[];
}

type RoleSelection =
  | { kind: "tech"; track: string }
  | { kind: "hr"; jobProfileId: number; jobName: string; category: string }
  | null;

const HR_SELECT_PREFIX = "hr::";
const GENERAL_PRACTICE_ROLE = "General interview";

const LEVEL_EXAMPLES: Record<string, string> = {
  easy: "Fundamentals and familiar interview questions",
  medium: "Applied questions using project examples",
  hard: "Complex situations and trade-offs",
  expert: "Leadership, scale and deep decisions",
};

/**
 * Practice and Assessment are two different products sharing one page.
 *
 * Practice generates questions freely and is never seen by anyone but the
 * student - it is the ROLE_OPTIONS tracks. Assessment is every job-profile
 * role: a facilitator published a specific set of questions for it, a score
 * means something to them, and the backend refuses to substitute AI content
 * for one (see interview_eligibility.py). Before this split both pools sat in
 * one dropdown with no label distinguishing them, so a student had no way to
 * know which kind of interview they were about to start.
 */
function readInterviewMode(value: string | null): InterviewMode {
  return value === "assessment" ? "assessment" : "practice";
}

export default function InterviewStartPage() {
  const searchParams = useSearchParams();
  const mode = readInterviewMode(searchParams.get("mode"));

  const [selection, setSelection] = useState<RoleSelection>(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [useResume, setUseResume] = useState(false);
  const [freeQuestionCount, setFreeQuestionCount] = useState(5);
  const [showPreflight, setShowPreflight] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const { data: jobProfilesData, isLoading: isLoadingProfiles } =
    apiClient.useQuery<JobProfilesResponse>({
      key: [ENDPOINTS_V2.JOB_PROFILES],
      url: ENDPOINTS_V2.JOB_PROFILES,
    });

  const jobProfiles = jobProfilesData?.items ?? [];
  const assessmentProfiles = profilesForMode(jobProfiles, "assessment");
  const selectableProfiles = profilesForMode(jobProfiles, mode);

  // A selection made under one mode must not carry into the other - the two
  // pools use the same "hr::" value shape, so without this a leftover
  // selection could silently submit as the wrong kind of interview.
  useEffect(() => {
    setSelection(null);
    setShowPreflight(false);
  }, [mode]);

  const selectedProfile =
    selection?.kind === "hr"
      ? jobProfiles.find((profile) => profile.id === selection.jobProfileId)
      : undefined;

  const isNonTech = selection?.kind === "hr" && isNonTechCategory(selection.category);
  const isTechFlow = !isNonTech;

  const offered = offeredDifficulties({
    isTechFlow,
    profileAvailableDifficulties: selectedProfile?.availableDifficulties,
  });
  // A string dep, so the effect below does not re-run on every render just
  // because `find` returned a new array reference.
  const offeredKey = offered?.join(",") ?? "";

  // The default is medium, so without this a facilitator who published only
  // easy questions would have every student submit an unavailable level and see
  // the server's refusal instead of an interview.
  useEffect(() => {
    setDifficulty((current) => correctedDifficulty(current, offered));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeredKey]);

  const { mutateAsync: createInterview, isPending: isCreatingInterview } = apiClient.useMutation<
    CreateInterviewResponse,
    CreateInterviewRequest
  >({
    url: ENDPOINTS_V2.CREATE_INTERVIEW,
    method: "post",
    successMessage: "Interview created successfully!",
    errorMessage: "Failed to create interview. Please try again.",
    keyToInvalidate: {
      queryKey: [
        ENDPOINTS.AUTH.ABOUT_ME,
        ENDPOINTS.INTERVIEWS.LIST,
        ENDPOINTS.INTERVIEWS.WITH_SUMMARY,
      ],
    },
  });

  const { mutateAsync: generateNonTechQuestions, isPending: isGeneratingNonTech } =
    apiClient.useMutation<GenerateNonTechResponse, GenerateNonTechRequest>({
      url: ENDPOINTS_V2.GENERATE_NON_TECH_QUESTIONS,
      method: "post",
      errorMessage: "Failed to start HR interview. Please try again.",
      keyToInvalidate: {
        queryKey: [
          ENDPOINTS.AUTH.ABOUT_ME,
          ENDPOINTS.INTERVIEWS.LIST,
          ENDPOINTS.INTERVIEWS.WITH_SUMMARY,
        ],
      },
    });

  const handleSelectChange = (value: string) => {
    setShowPreflight(false);
    if (!value) {
      setSelection(null);
      return;
    }
    if (value.startsWith(HR_SELECT_PREFIX)) {
      const rest = value.slice(HR_SELECT_PREFIX.length);
      const separatorIdx = rest.indexOf("::");
      const idStr = rest.slice(0, separatorIdx);
      const jobName = rest.slice(separatorIdx + 2);

      const profileId = Number(idStr);
      const profile = jobProfiles.find((p) => p.id === profileId);
      const category = profile?.category || "HR & Non-Technical";

      setSelection({ kind: "hr", jobProfileId: profileId, jobName, category });
    } else {
      setSelection({ kind: "tech", track: value });
    }
    trackRoleSelected(value);
  };

  const getSelectValue = () => {
    if (!selection) return "";
    if (selection.kind === "tech") return selection.track;
    return `${HR_SELECT_PREFIX}${selection.jobProfileId}::${selection.jobName}`;
  };

  const handleToggleResume = (checked: boolean) => {
    setUseResume(checked);
    trackResumeToggleClick(checked);
    if (checked) {
      toast.success("Resume will be considered for this interview");
    } else {
      toast.error("Resume will not be considered for this interview");
    }
  };

  const validateSelection = (): boolean => {
    if (!selection) return false;
    if (selection.kind === "hr" && selectedProfile?.interviewMode !== mode) {
      toast.error("Select a role published for this interview purpose.");
      return false;
    }
    if (
      selection.kind === "tech" &&
      (!Number.isInteger(freeQuestionCount) || freeQuestionCount < 1 || freeQuestionCount > 10)
    ) {
      toast.error("Choose a whole number from 1 to 10 questions.");
      return false;
    }

    if (
      mode === "assessment" &&
      (selection.kind !== "hr" || selectedProfile?.interviewMode !== "assessment")
    ) {
      toast.error(
        "This role is not configured for a formal assessment. Please select an assessment role."
      );
      return false;
    }

    const refusal = unavailableDifficultyMessage(difficulty, offered);
    if (refusal) {
      toast.error(refusal);
      return false;
    }

    const selectedTrack = selection.kind === "tech" ? selection.track : selection.jobName;
    const resumeRequired =
      selection.kind === "tech" && selectedTrack === FULL_STACK_ROLE && difficulty === "medium";
    if (resumeRequired && !useResume) {
      toast.error(
        "Medium Full Stack practice uses your resume. Turn on resume personalisation or choose another level."
      );
      return false;
    }
    if (resumeRequired && !user?.authorizedUser?.hasResume) {
      toast.error(
        "Save a resume from the Resume section before starting Medium Full Stack practice, or choose another level."
      );
      return false;
    }
    return true;
  };

  const handleReviewSetup = () => {
    if (!validateSelection()) return;
    if (mode === "practice") {
      trackEvent("practice_setup_started", {
        role_type: selection?.kind ?? "unknown",
        level: difficulty,
        resume_enabled: useResume,
      });
      setShowPreflight(true);
      return;
    }
    void handleSubmit();
  };

  const handleSubmit = async () => {
    if (!selection || !validateSelection()) return;

    const trackLabel = selection.kind === "tech" ? selection.track : selection.jobName;
    trackStartInterviewButtonClick(trackLabel, difficulty, useResume);

    try {
      if (isTechFlow) {
        const track = selection.kind === "tech" ? selection.track : selection.jobName;
        const jobProfileId = selection.kind === "hr" ? selection.jobProfileId : undefined;

        const data = await createInterview({
          clientContract: "fixed-round-v1",
          track,
          difficulty,
          jobProfileId,
          ...(selection.kind === "tech" ? { questionCount: freeQuestionCount } : {}),
        });
        // console.log("Data to create interview", data);
        if (data?.interviewId) {
          const expected =
            selection.kind === "tech" ? freeQuestionCount : selectedProfile?.questionsPerInterview;
          if (expected != null && data.plannedQuestionCount !== expected) {
            toast.error(
              "The server could not confirm the selected question count. Refresh the app before starting."
            );
            return;
          }
          if (mode === "assessment" && data.interviewMode !== "assessment") {
            toast.error(
              "The selected role is no longer configured for assessment. Please choose another role."
            );
            return;
          }
          router.push(
            `/interview?interviewId=${data.interviewId}&useResume=${useResume}&role=${encodeURIComponent(track)}&interviewMode=${data.interviewMode ?? "practice"}`
          );
        }
      } else {
        const result = await generateNonTechQuestions({
          clientContract: "fixed-round-v1",
          jobProfileId: selection.jobProfileId,
          difficulty,
          useResume,
        });
        if (result?.interviewId) {
          if (
            selectedProfile?.questionsPerInterview != null &&
            result.plannedQuestionCount !== selectedProfile.questionsPerInterview
          ) {
            toast.error(
              "The server could not confirm this round's question count. Refresh before starting."
            );
            return;
          }
          if (mode === "assessment" && result.interviewMode !== "assessment") {
            toast.error(
              "The selected role is no longer configured for assessment. Please choose another role."
            );
            return;
          }
          setInterviewQuestions(result.interviewId, result.items);
          router.push(
            `/interview?interviewId=${result.interviewId}&useResume=${useResume}&role=${encodeURIComponent(selection.jobName)}&resumed=true&interviewMode=${result.interviewMode ?? "practice"}`
          );
        }
      }
    } catch (error) {
      console.error("Error starting interview:", error);
    }
  };

  const isPending = isCreatingInterview || isGeneratingNonTech;
  const selectedTrack = selection?.kind === "tech" ? selection.track : selection?.jobName;
  const questionCount =
    selection?.kind === "hr" ? (selectedProfile?.questionsPerInterview ?? 5) : freeQuestionCount;

  if (showPreflight && mode === "practice" && selection && selectedTrack) {
    return (
      <PracticePreflight
        role={selectedTrack}
        level={difficulty}
        questionCount={questionCount}
        durationMinutes={questionCount * 3}
        isStarting={isPending}
        onBack={() => setShowPreflight(false)}
        onStart={() => void handleSubmit()}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8 text-[#111827]">
      <div className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#344499]">
          {mode === "assessment" ? "Formal sitting" : "Practice setup"}
        </p>
        <h1 className="text-3xl font-bold leading-tight">
          {mode === "assessment" ? "Assessment Interview" : "Practice Interview"}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-gray-600">
          {mode === "assessment"
            ? "Questions are set by your facilitator and reviewed as a formal result."
            : "Choose what you want to practise. This is private coaching, not an exam, and ordinary interruptions will not punish you."}
        </p>
      </div>

      <section className="rounded-3xl border border-[#D6E0FB] bg-white p-5 sm:p-7">
        <div>
          <label className="mb-2 block text-base font-bold text-black">
            {mode === "assessment"
              ? "Which assessment are you joining?"
              : "What role are you practising for?"}
          </label>
          {mode === "practice" && (
            <p className="mb-3 text-sm text-gray-600">
              Not sure yet? Choose General interview and start with common questions.
            </p>
          )}
          {mode === "assessment" && !isLoadingProfiles && assessmentProfiles.length === 0 ? (
            <p className="text-[13px] text-gray-600 font-noto">
              No assessment roles are available yet. Check back once your facilitator has published
              one.
            </p>
          ) : (
            <select
              value={getSelectValue()}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="select select-bordered w-full"
              disabled={isLoadingProfiles}
            >
              <option value="" disabled>
                {isLoadingProfiles ? "Loading roles..." : "Select a role"}
              </option>
              {mode === "practice" && (
                <option value={GENERAL_PRACTICE_ROLE}>I am not sure — General interview</option>
              )}
              {mode === "practice" &&
                ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              {selectableProfiles.length > 0 &&
                Object.entries(
                  selectableProfiles.reduce(
                    (acc, profile) => {
                      const category = profile.category || "HR & Non-Technical";
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(profile);
                      return acc;
                    },
                    {} as Record<string, JobProfile[]>
                  )
                ).map(([category, profiles]) => (
                  <optgroup
                    key={category}
                    label={`${mode === "practice" ? "Curated practice · " : ""}${category.charAt(0).toUpperCase() + category.slice(1)}`}
                  >
                    {profiles.map((profile) => (
                      <option
                        key={profile.id}
                        value={`${HR_SELECT_PREFIX}${profile.id}::${profile.title}`}
                      >
                        {profile.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          )}
        </div>

        {/* Hidden for the non-tech flow, which fixes its own difficulty server-side. */}
        {isTechFlow && (
          <div className="space-y-3">
            <label className="block text-base font-bold text-black">Choose a level</label>

            <div className="grid gap-3 sm:grid-cols-2">
              {DIFFICULTY_LEVEL.map((opt) => {
                const available = isDifficultyOffered(opt.key, offered);
                return (
                  <label
                    key={opt.key}
                    className={`flex min-h-20 items-start gap-3 rounded-2xl border p-4 ${
                      difficulty === opt.key ? "border-[#344499] bg-[#F5F7FF]" : "border-gray-200"
                    } ${available ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={opt.key}
                      checked={difficulty === opt.key}
                      disabled={!available}
                      onChange={(e) => {
                        setDifficulty(e.target.value);
                        trackDifficultySelected(e.target.value);
                      }}
                      className="radio radio-sm"
                    />
                    <span>
                      <span className="block font-bold text-black">{opt.label}</span>
                      <span className="mt-1 block text-sm leading-5 text-gray-600">
                        {LEVEL_EXAMPLES[opt.key]}
                      </span>
                    </span>
                    {!available && (
                      <span className="text-[12px] text-gray-500 font-noto">Not available yet</span>
                    )}
                  </label>
                );
              })}
            </div>

            {offered?.length === 0 && (
              <p className="text-[13px] text-gray-600 font-noto">
                This role has no interview levels ready yet. Your facilitator needs to add more
                questions before it can be started.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label className="text-[14px] font-noto font-[500] text-black">
                Personalise with my resume
              </label>
              <span className="text-[12px] text-gray-600 font-noto">
                {useResume
                  ? "Your saved resume will help tailor the questions."
                  : "Optional for most roles. You can practise without it."}
              </span>
            </div>

            <input
              type="checkbox"
              checked={useResume}
              onChange={(e) => handleToggleResume(e.target.checked)}
              className="toggle toggle-sm"
              aria-label="Toggle resume usage"
            />
          </div>
        </div>

        <div className="mt-5 border-t border-[#DEE8FB] pt-5">
          {selection?.kind === "tech" ? (
            <label className="block font-semibold">
              Questions in this practice round
              <input
                type="number"
                min={1}
                max={10}
                step={1}
                value={Number.isFinite(freeQuestionCount) ? freeQuestionCount : ""}
                onChange={(event) =>
                  setFreeQuestionCount(
                    event.target.value === "" ? Number.NaN : Number(event.target.value)
                  )
                }
                className="mt-2 block min-h-12 w-full rounded-lg border border-[#9CA3AF] px-3 text-base sm:max-w-xs"
              />
            </label>
          ) : selectedProfile ? (
            <p className="font-semibold">
              {questionCount} approved questions · about {questionCount * 3} minutes
            </p>
          ) : null}
          {selection?.kind === "tech" && (
            <p className="mt-2 text-sm text-gray-600">
              Choose 1–10 questions. You can save and return to practice.
            </p>
          )}
        </div>
        <div className="pt-4">
          <button
            onClick={handleReviewSetup}
            disabled={isPending || !selection}
            className="btn btn-neutral btn-block btn-lg cursor-pointer"
          >
            {isPending
              ? "Starting interview…"
              : mode === "practice"
                ? "Continue to device check"
                : "Start assessment"}
          </button>
        </div>
      </section>
    </div>
  );
}
