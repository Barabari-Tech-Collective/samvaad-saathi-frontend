"use client";

import { ENDPOINTS } from "@/lib/api-config";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService, APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import {
  EXPERIENCE_OPTIONS,
  MAX_RESUME_SIZE_MB,
  ROLE_OPTIONS,
} from "@/lib/constants";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import toast from "react-hot-toast";

interface Step2Props {
  onNext: (data: { target_position: string; years_experience: string }) => void;
  isLoading?: boolean;
}

interface JobProfile {
  jobProfileId: number;
  jobName: string;
  companyName: string;
}

interface JobProfilesResponse {
  items: JobProfile[];
}

// Create RESUME API client
const resumeApiClient = createApiClient(APIService.RESUME);
const jobProfilesApiClient = createApiClient(APIServiceV2.INTERVIEWS);

export default function Step2({ onNext, isLoading = false }: Step2Props) {
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  const experiences = EXPERIENCE_OPTIONS;

  const { data: jobProfilesData, isLoading: isLoadingProfiles } =
    jobProfilesApiClient.useQuery<JobProfilesResponse>({
      key: [ENDPOINTS_V2.JOB_PROFILES],
      url: ENDPOINTS_V2.JOB_PROFILES,
    });

  const jobProfiles = jobProfilesData?.items ?? [];

  // Set up mutation for resume extraction
  const extractResumeMutation = resumeApiClient.useMutation({
    url: ENDPOINTS.RESUME.EXTRACT,
    method: "post",
    successMessage: "Resume processed successfully!",
    errorMessage: "Failed to process resume. Please try again.",
    config: {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  });

  const handleSubmit = async () => {
    // Call resume extraction API if resume is selected
    if (resume) {
      try {
        const formData = new FormData();
        formData.append("file", resume);
        await extractResumeMutation.mutateAsync(formData);
      } catch {
        toast.error("Resume extraction failed");
        // Don't prevent form submission if extraction fails
      }
    }

    // Pass data to parent component for profile API call
    onNext({
      target_position: role,
      years_experience: experience,
    });
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type - only allow PDF
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file only");
        return;
      }

      // Check file size
      if (file.size > MAX_RESUME_SIZE_MB * 1024 * 1024) {
        toast.error(`File size must be less than ${MAX_RESUME_SIZE_MB}MB`);
        return;
      }

      setResume(file);
    }
  };

  const handleRemoveResume = () => {
    setResume(null);
    // Reset the file input
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="relative w-full bg-gradient-to-br from-purple-50 to-blue-50 px-4 pt-10 font-inter">
      {/* Heading */}
      <div className="text-center">
        <h2 className="text-[36px] font-[700] font-noto text-gray-800">
          Career Setup
        </h2>
      </div>
      {/* Form Container */}
      <div className="max-w-md mx-auto  p-8 ">
        {/* Target Role Dropdown */}
        <div className="mb-6">
          <label className="block mb-3 text-[16px] font-noto font-[600] text-gray-800">
            Target Position / Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isLoadingProfiles}
            className="select select-bordered w-full h-[60px] text-gray-800 font-noto text-[16px] rounded-xl"
          >
            <option value="" disabled>
              {isLoadingProfiles ? "Loading roles..." : "Select Role"}
            </option>
            <optgroup label="Technical">
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </optgroup>
            {jobProfiles.length > 0 && (
              <optgroup label="HR & Non-Technical">
                {jobProfiles.map((profile) => (
                  <option key={profile.jobProfileId} value={profile.jobName}>
                    {profile.jobName}
                    {profile.companyName ? ` — ${profile.companyName}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Experience Dropdown */}
        <div className="mb-6">
          <label className="block mb-3 text-[16px] font-noto font-[600] text-gray-800">
            Years of Experience
          </label>
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="select select-bordered w-full h-[60px] text-gray-800 font-noto text-[16px] rounded-xl"
          >
            <option value="" disabled>
              Select Years of Experience
            </option>
            {experiences.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "0"
                  ? "0 (Fresher)"
                  : `${opt} year${opt === "1" ? "" : "s"}`}
              </option>
            ))}
          </select>
        </div>

        {/* Resume Upload */}
        <div className="mb-6">
          <label className="block mb-3 text-[16px] font-noto font-[600] text-gray-800">
            Resume (Optional, PDF only, Max {MAX_RESUME_SIZE_MB}MB)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleResumeUpload}
            className="file-input file-input-bordered w-full h-[60px] text-gray-800 font-noto text-[16px] rounded-xl"
          />
          {resume && (
            <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-[14px] text-green-600 font-medium flex items-center">
                <span className="mr-2">✓</span>
                {resume.name}
              </p>
              <button
                type="button"
                onClick={handleRemoveResume}
                className="btn btn-error btn-xs btn-soft"
                title="Remove file"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            !role || !experience || isLoading || extractResumeMutation.isPending
          }
          className={`flex-1 py-6 rounded-xl btn btn-neutral btn-block mt-6 ${
            role && experience && !isLoading && !extractResumeMutation.isPending
              ? " hover:shadow-lg"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {isLoading || extractResumeMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="loading loading-spinner loading-md"></span>
              {extractResumeMutation.isPending
                ? "Processing Resume..."
                : "Creating Profile..."}
            </span>
          ) : (
            "Complete Setup"
          )}
        </button>
      </div>
    </div>
  );
}
