"use client";

import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";

import PageHeading from "@/components/studio/PageHeading";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
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
import { createdInterview, publishedQuestionCount } from "@/lib/interview-entry";
import { responseStatus } from "@/lib/interview-history";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  trackDifficultySelected,
  trackEvent,
  trackResumeToggleClick,
  trackRoleSelected,
  trackStartInterviewButtonClick,
} from "@/lib/posthog/tracking.utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

function EntryRecovery({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-[#DEE8FB] bg-white p-5 text-[#1F285B] sm:p-8">
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
      <div className="flex flex-wrap gap-4">
        <Link className="ws-button" href="/history">
          Check History
        </Link>
        <Link className="ws-button" href="/practice">
          Back to practice
        </Link>
      </div>
    </div>
  );
}

export default function InterviewStartPage() {
  const raw = useSearchParams().get("mode");
  const { user, loading } = useAuth();
  if (raw !== null && raw !== "practice" && raw !== "assessment")
    return (
      <EntryRecovery title="Check this interview purpose">
        <p role="alert">Choose Practice or Assessment from the platform before starting.</p>
      </EntryRecovery>
    );
  if (loading || !user?.userId)
    return (
      <EntryRecovery title="Checking your account">
        <p role="status">Sign in before choosing an interview.</p>
      </EntryRecovery>
    );
  const mode = raw ?? "practice";
  return (
    <InterviewSetup key={`${user.userId}:${mode}`} account={String(user.userId)} mode={mode} />
  );
}

function InterviewSetup({ account, mode }: { account: string; mode: InterviewMode }) {
  const ownerRevision = useRef(getAuthRevision()).current;
  const current = useRef(true);
  const submitting = useRef(false);
  useLayoutEffect(() => {
    current.current = true;
    return () => {
      current.current = false;
    };
  }, []);
  const [startError, setStartError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [selection, setSelection] = useState<RoleSelection>(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [useResume, setUseResume] = useState(false);
  const [freeQuestionCount, setFreeQuestionCount] = useState(5);
  const [showPreflight, setShowPreflight] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const catalogue = useQuery<JobProfilesResponse>({
    queryKey: ["interview-entry-profiles", account, mode],
    queryFn: async ({ signal }) => {
      assertAuthRevision(ownerRevision);
      const value = await apiClient.get<JobProfilesResponse>(ENDPOINTS_V2.JOB_PROFILES, { signal });
      assertAuthRevision(ownerRevision);
      if (
        !value ||
        !Array.isArray(value.items) ||
        value.items.some(
          (p) =>
            !p ||
            !Number.isSafeInteger(p.id) ||
            p.id < 1 ||
            typeof p.title !== "string" ||
            (p.category != null && typeof p.category !== "string") ||
            (p.availableDifficulties !== undefined &&
              (!Array.isArray(p.availableDifficulties) ||
                p.availableDifficulties.some(
                  (d) => !["easy", "medium", "hard", "expert"].includes(d)
                )))
        )
      )
        throw new Error("Role catalogue could not be verified.");
      if (new Set(value.items.map((p) => p.id)).size !== value.items.length)
        throw new Error("Role catalogue contains duplicate roles.");
      return value;
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const catalogueReady = useRef(false);
  useLayoutEffect(() => {
    catalogueReady.current = !!catalogue.data && !catalogue.isFetching && !catalogue.isError;
  }, [catalogue.data, catalogue.isFetching, catalogue.isError]);
  const jobProfiles = catalogue.data?.items ?? [];
  const assessmentProfiles = profilesForMode(jobProfiles, "assessment");
  const selectableProfiles = profilesForMode(jobProfiles, mode);
  const isLoadingProfiles = catalogue.isFetching;

  const selectedProfile =
    selection?.kind === "hr"
      ? jobProfiles.find((profile) => profile.id === selection.jobProfileId)
      : undefined;

  const isNonTech = selection?.kind === "hr" && isNonTechCategory(selection.category);
  const isTechFlow = !isNonTech;

  const offered = offeredDifficulties({
    isTechFlow,
    profileAvailableDifficulties:
      selection?.kind === "hr" && isTechFlow
        ? (selectedProfile?.availableDifficulties ?? [])
        : undefined,
  });
  // A string dep, so the effect below does not re-run on every render just
  // because `find` returned a new array reference.
  const offeredKey = offered?.join(",") ?? "";

  // Correct the current level when a facilitator has published only
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
    showToastError: false,
    options: { retry: false },
  });

  const { mutateAsync: generateNonTechQuestions, isPending: isGeneratingNonTech } =
    apiClient.useMutation<GenerateNonTechResponse, GenerateNonTechRequest>({
      url: ENDPOINTS_V2.GENERATE_NON_TECH_QUESTIONS,
      method: "post",
      showToastError: false,
      options: { retry: false },
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
    if (!selection || catalogue.isFetching || catalogue.isError || uncertain) return false;
    if (
      selection.kind === "hr" &&
      publishedQuestionCount(selectedProfile?.questionsPerInterview) === null
    ) {
      setStartError(
        "This role does not have a verified published question count. Check the roles again or ask your facilitator."
      );
      return false;
    }
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
    if (getAuthRevision() !== ownerRevision || !current.current) return;
    if (submitting.current || !selection || !validateSelection()) return;
    submitting.current = true;
    setStartError("");

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
        if (!current.current || getAuthRevision() !== ownerRevision) return;
        if (!catalogueReady.current)
          throw new Error("Current role access must be checked in History.");
        const expected =
          selection.kind === "tech"
            ? freeQuestionCount
            : publishedQuestionCount(selectedProfile?.questionsPerInterview)!;
        const id = createdInterview(data, mode, expected);
        router.push(
          `/interview?${new URLSearchParams({ interviewId: id, useResume: String(useResume), role: track, interviewMode: mode })}`
        );
      } else {
        const result = await generateNonTechQuestions({
          clientContract: "fixed-round-v1",
          jobProfileId: selection.jobProfileId,
          difficulty,
          useResume,
        });
        if (!current.current || getAuthRevision() !== ownerRevision) return;
        if (!catalogueReady.current)
          throw new Error("Current role access must be checked in History.");
        const id = createdInterview(
          result,
          mode,
          publishedQuestionCount(selectedProfile?.questionsPerInterview)!
        );
        // Resume reads the persisted question snapshot; do not trust/copy a cached subset.
        router.push(
          `/interview?${new URLSearchParams({ interviewId: id, useResume: String(useResume), role: selection.jobName, resumed: "true", interviewMode: mode })}`
        );
      }
    } catch (error) {
      if (!current.current || getAuthRevision() !== ownerRevision) return;
      setShowPreflight(false);
      const status = responseStatus(error);
      const rejected = status !== undefined && [400, 401, 403, 404, 410, 422, 429].includes(status);
      if (rejected) {
        setStartError(
          "The request was rejected. Check the role, resume and your current access before trying again."
        );
        void catalogue.refetch();
      } else {
        setUncertain(true);
        setStartError(
          "Creation was not confirmed. A sitting may already exist. Check History before starting another interview."
        );
      }
    } finally {
      submitting.current = false;
    }
  };

  const isPending = isCreatingInterview || isGeneratingNonTech;
  const selectedTrack = selection?.kind === "tech" ? selection.track : selection?.jobName;
  const questionCount =
    selection?.kind === "hr"
      ? (publishedQuestionCount(selectedProfile?.questionsPerInterview) ?? 0)
      : freeQuestionCount;

  if (uncertain)
    return (
      <EntryRecovery title="Check whether your interview was created">
        <p role="alert">{startError}</p>
      </EntryRecovery>
    );
  if (catalogue.isError)
    return (
      <EntryRecovery title="Interview roles could not be loaded">
        <p role="alert">
          We could not verify the current roles. This does not mean there are no assessments
          available.
        </p>
        <button
          type="button"
          className="min-h-11 rounded-xl bg-black px-5 py-3 font-semibold text-white"
          onClick={() => void catalogue.refetch()}
        >
          Check roles again
        </button>
      </EntryRecovery>
    );
  if (catalogue.isFetching || !catalogue.data)
    return (
      <EntryRecovery title="Checking current interview roles">
        <p role="status">Loading the roles available to your account…</p>
      </EntryRecovery>
    );

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
      <PageHeading
        className="studio-setup-heading"
        eyebrow={mode === "assessment" ? "Formal assessment" : "Prepare your round"}
        title={mode === "assessment" ? "Assessment Interview" : "Practice Interview"}
        description={
          mode === "assessment"
            ? "Questions are set by your facilitator and reviewed as a formal result."
            : "Choose a role and level. Next, check your microphone before starting your spoken answers."
        }
      />
      <ol className="studio-setup-steps" aria-label="Interview setup steps">
        <li aria-current="step">
          <span>1</span>Choose your interview
        </li>
        <li>
          <span>2</span>
          {mode === "assessment" ? "Review instructions" : "Check microphone"}
        </li>
        <li>
          <span>3</span>Begin
        </li>
      </ol>

      {startError && (
        <p role="alert" className="rounded-xl border border-[#DEE8FB] bg-white p-4">
          {startError}
        </p>
      )}
      <fieldset disabled={isPending} className="studio-panel studio-setup-form">
        <div>
          <label htmlFor="interview-role" className="mb-2 block text-base font-bold text-black">
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
              id="interview-role"
              value={getSelectValue()}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="select select-bordered w-full"
              disabled={isLoadingProfiles}
            >
              <option value="" disabled>
                {isLoadingProfiles ? "Loading roles..." : "Select a role"}
              </option>
              {mode === "practice" && (
                <option value={GENERAL_PRACTICE_ROLE}>I am not sure: General interview</option>
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
                        disabled={publishedQuestionCount(profile.questionsPerInterview) === null}
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col">
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
              {questionCount
                ? `${questionCount} approved questions · about ${questionCount * 3} minutes`
                : "Published question count unavailable"}
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
            disabled={isPending || !selection || (isTechFlow && offered?.length === 0)}
            className="btn btn-neutral btn-block btn-lg cursor-pointer"
          >
            {isPending
              ? "Starting interview…"
              : mode === "practice"
                ? "Continue to device check"
                : "Start assessment"}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
