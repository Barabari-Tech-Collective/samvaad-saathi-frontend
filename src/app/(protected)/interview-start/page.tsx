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
import { setInterviewQuestions } from "@/lib/interview-session-storage";
import {
  trackDifficultySelected,
  trackResumeToggleClick,
  trackRoleSelected,
  trackStartInterviewButtonClick,
} from "@/lib/posthog/tracking.utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/auth-provider";

interface CreateInterviewRequest {
  track: string;
  difficulty: string;
  jobProfileId?: number;
}

interface CreateInterviewResponse {
  interviewId: string;
}

interface JobProfile {
  id: number;
  title: string;
  description: string;
  category?: string;
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
  jobProfileId: number;
  difficulty: string;
  useResume: boolean;
}

interface GenerateNonTechResponse {
  interviewId: number;
  track: string;
  items: unknown[];
}

type RoleSelection =
  | { kind: "tech"; track: string }
  | { kind: "hr"; jobProfileId: number; jobName: string; category: string }
  | null;

const HR_SELECT_PREFIX = "hr::";

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
type InterviewMode = "practice" | "assessment";

function readInterviewMode(value: string | null): InterviewMode {
  return value === "assessment" ? "assessment" : "practice";
}

export default function InterviewStartPage() {
  const searchParams = useSearchParams();
  const mode = readInterviewMode(searchParams.get("mode"));

  const [selection, setSelection] = useState<RoleSelection>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [useResume, setUseResume] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

  const { data: jobProfilesData, isLoading: isLoadingProfiles } =
    apiClient.useQuery<JobProfilesResponse>({
      key: [ENDPOINTS_V2.JOB_PROFILES],
      url: ENDPOINTS_V2.JOB_PROFILES,
    });

  const jobProfiles = jobProfilesData?.items ?? [];

  // A selection made under one mode must not carry into the other - the two
  // pools use the same "hr::" value shape, so without this a leftover
  // selection could silently submit as the wrong kind of interview.
  useEffect(() => {
    setSelection(null);
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

  const handleSubmit = async () => {
    if (!selection) return;

    // The picker already disables these, but a stale profile list or a mid-session
    // change by the facilitator can still leave an unavailable level selected.
    // Saying so here is better than submitting and surfacing a server refusal.
    const refusal = unavailableDifficultyMessage(difficulty, offered);
    if (refusal) {
      toast.error(refusal);
      return;
    }

    if (isTechFlow && difficulty === "medium" && !useResume) {
      const trackLabel = selection.kind === "tech" ? selection.track : selection.jobName;
      toast.error(
        `Please toggle 'Use Resume for Interview' and ensure your resume is uploaded for Medium level ${trackLabel} interviews.`
      );
      return;
    }

    if (isTechFlow && difficulty === "medium" && !user?.authorizedUser?.hasResume) {
      const trackLabel = selection.kind === "tech" ? selection.track : selection.jobName;
      toast.error(
        `You must save a resume first before starting a Medium level ${trackLabel} interview. If you want to upload your resume, please use the ATS feature (the document icon beside the profile icon) in the bottom navigation bar.`
      );
      return;
    }

    const trackLabel = selection.kind === "tech" ? selection.track : selection.jobName;
    trackStartInterviewButtonClick(trackLabel, difficulty, useResume);

    try {
      if (isTechFlow) {
        const track = selection.kind === "tech" ? selection.track : selection.jobName;
        const jobProfileId = selection.kind === "hr" ? selection.jobProfileId : undefined;

        const data = await createInterview({ track, difficulty, jobProfileId });
        // console.log("Data to create interview", data);
        if (data?.interviewId) {
          router.push(
            `/interview?interviewId=${data.interviewId}&useResume=${useResume}&role=${encodeURIComponent(track)}`
          );
        }
      } else {
        const result = await generateNonTechQuestions({
          jobProfileId: selection.jobProfileId,
          difficulty,
          useResume,
        });
        if (result?.interviewId) {
          setInterviewQuestions(result.interviewId, result.items);
          router.push(
            `/interview?interviewId=${result.interviewId}&useResume=${useResume}&role=${encodeURIComponent(selection.jobName)}&resumed=true`
          );
        }
      }
    } catch (error) {
      console.error("Error starting interview:", error);
    }
  };

  const isPending = isCreatingInterview || isGeneratingNonTech;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h2 className="text-center text-[20px] font-bold leading-6">
          {mode === "assessment" ? "Assessment Interview" : "Practice Interview"}
        </h2>
        <p className="text-center text-[13px] text-gray-600 font-noto px-2">
          {mode === "assessment"
            ? "Questions are set by your facilitator and reviewed as a formal result."
            : "Free practice with AI-generated questions and feedback. Your facilitator may see your scores and invite you to a formal assessment based on them."}
        </p>
      </div>

      <div>
        <label className="block text-[14px] font-noto font-[500] text-black mb-2">Role</label>
        {mode === "assessment" && !isLoadingProfiles && jobProfiles.length === 0 ? (
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
            {mode === "practice" &&
              ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            {mode === "assessment" &&
              jobProfiles.length > 0 &&
              Object.entries(
                jobProfiles.reduce(
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
                  label={category.charAt(0).toUpperCase() + category.slice(1)}
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
          <label className="block text-[14px] font-noto font-[500] text-black">
            Difficulty Level
          </label>

          <div className="space-y-2">
            {DIFFICULTY_LEVEL.map((opt) => {
              const available = isDifficultyOffered(opt.key, offered);
              return (
                <label
                  key={opt.key}
                  className={`flex items-center gap-3 ${
                    available ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
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
                  <span className="text-[14px] text-black font-noto">{opt.label}</span>
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

      <div className="pt-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <label className="text-[14px] font-noto font-[500] text-black">
              Use Resume for Interview
            </label>
            <span className="text-[12px] text-gray-600 font-noto">
              {useResume
                ? "Resume will be considered for this interview"
                : "Resume will not be considered for this interview"}
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

      <div className="pt-4">
        <button
          onClick={handleSubmit}
          disabled={isPending || !selection}
          className="btn btn-neutral btn-block btn-lg cursor-pointer"
        >
          {isPending ? "Starting Interview..." : "Start Interview"}
        </button>
      </div>
    </div>
  );
}
