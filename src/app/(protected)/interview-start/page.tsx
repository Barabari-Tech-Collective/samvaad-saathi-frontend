"use client";

import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS, ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { ROLE_OPTIONS } from "@/lib/constants";
import { setInterviewQuestions } from "@/lib/interview-session-storage";
import {
    trackDifficultySelected,
    trackResumeToggleClick,
    trackRoleSelected,
    trackStartInterviewButtonClick,
} from "@/lib/posthog/tracking.utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

interface CreateInterviewRequest {
    track: string;
    difficulty: string;
}

interface CreateInterviewResponse {
    interviewId: string;
}

interface JobProfile {
    jobProfileId: number;
    jobName: string;
    companyName: string;
}

interface JobProfilesResponse {
    items: JobProfile[];
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
    | { kind: "hr"; jobProfileId: number; jobName: string }
    | null;

const DIFFICULTY_LEVEL = [
    { key: "easy", label: "Easy" },
    { key: "medium", label: "Medium" },
    { key: "hard", label: "Hard" },
    { key: "expert", label: "Expert" },
];

const HR_SELECT_PREFIX = "hr::";

export default function InterviewStartPage() {
    const [selection, setSelection] = useState<RoleSelection>(null);
    const [difficulty, setDifficulty] = useState("medium");
    const [useResume, setUseResume] = useState(false);

    const router = useRouter();
    const apiClient = createApiClient(APIServiceV2.INTERVIEWS);

    const { data: jobProfilesData, isLoading: isLoadingProfiles } =
        apiClient.useQuery<JobProfilesResponse>({
            key: [ENDPOINTS_V2.JOB_PROFILES],
            url: ENDPOINTS_V2.JOB_PROFILES,
        });

    const jobProfiles = jobProfilesData?.items ?? [];

    const { mutateAsync: createInterview, isPending: isCreatingInterview } =
        apiClient.useMutation<CreateInterviewResponse, CreateInterviewRequest>({
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
            setSelection({ kind: "hr", jobProfileId: Number(idStr), jobName });
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

        const trackLabel = selection.kind === "tech" ? selection.track : selection.jobName;
        trackStartInterviewButtonClick(trackLabel, difficulty, useResume);

        try {
            if (selection.kind === "tech") {
                const data = await createInterview({ track: selection.track, difficulty });
                if (data?.interviewId) {
                    router.push(
                        `/interview?interviewId=${data.interviewId}&useResume=${useResume}&role=${encodeURIComponent(selection.track)}`
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
                    Select Your Interview
                </h2>
                <h2 className="text-center text-[20px] font-bold leading-6">
                    Preferences
                </h2>
            </div>

            <div>
                <label className="block text-[14px] font-noto font-[500] text-black mb-2">
                    Role
                </label>
                <select
                    value={getSelectValue()}
                    onChange={(e) => handleSelectChange(e.target.value)}
                    className="select select-bordered w-full"
                    disabled={isLoadingProfiles}
                >
                    <option value="" disabled>
                        {isLoadingProfiles ? "Loading roles..." : "Select a role"}
                    </option>
                    <optgroup label="Technical">
                        {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </optgroup>
                    {jobProfiles.length > 0 && (
                        <optgroup label="HR & Non-Technical">
                            {jobProfiles.map((profile) => (
                                <option
                                    key={profile.jobProfileId}
                                    value={`${HR_SELECT_PREFIX}${profile.jobProfileId}::${profile.jobName}`}
                                >
                                    {profile.jobName}
                                    {profile.companyName ? ` — ${profile.companyName}` : ""}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>
            </div>

            {selection?.kind !== "hr" && (
            <div className="space-y-3">
                <label className="block text-[14px] font-noto font-[500] text-black">
                    Difficulty Level
                </label>

                <div className="space-y-2">
                    {DIFFICULTY_LEVEL.map((opt) => (
                        <label
                            key={opt.key}
                            className="flex items-center gap-3 cursor-pointer"
                        >
                            <input
                                type="radio"
                                name="difficulty"
                                value={opt.key}
                                checked={difficulty === opt.key}
                                onChange={(e) => {
                                    setDifficulty(e.target.value);
                                    trackDifficultySelected(e.target.value);
                                }}
                                className="radio radio-sm"
                            />
                            <span className="text-[14px] text-black font-noto">
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </div>
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
