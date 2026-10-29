"use client";

import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";

import {
  prepareResumeUpload,
  rememberResumeReceipt,
  resumeOperationKey,
} from "@/lib/resume-storage-recovery";
import { assertResumeDataSaved } from "@/lib/resume-readiness";
import ResumeStorageRecovery from "@/components/resume/ResumeStorageRecovery";
import PageHeading from "@/components/studio/PageHeading";
import { createApiClient, ENDPOINTS, extractApiErrorMessage } from "@/lib/api-config";
import { APIService, APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { EXPERIENCE_OPTIONS, MAX_RESUME_SIZE_MB, ROLE_OPTIONS } from "@/lib/constants";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

interface Step2Props {
  onNext: (data: { target_position: string; years_experience: string }) => void | Promise<void>;
  isLoading?: boolean;
  onBack: () => void;
}

interface JobProfile {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

interface JobProfilesResponse {
  items: JobProfile[];
  total: number;
}

// Create RESUME API client
const resumeApiClient = createApiClient(APIService.RESUME);
const jobProfilesApiClient = createApiClient(APIServiceV2.INTERVIEWS);

export default function Step2({ onNext, onBack, isLoading = false }: Step2Props) {
  const ownerRevision = useRef(getAuthRevision()).current;
  const uploadOperation = useRef("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const savedResume = useRef<File | null>(null);
  const [experience, setExperience] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

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

    showToastError: false,
    config: {
      headers: {
        "Content-Type": "multipart/form-data",
        get "Idempotency-Key"() {
          return uploadOperation.current;
        },
      },
      timeout: 300000, // 5 minutes specifically for ATS analysis
    },
  });

  const handleSubmit = async () => {
    if (submitting.current || isLoading || !role || !experience) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      // Call resume extraction API if resume is selected
      if (resume && savedResume.current !== resume) {
        try {
          const formData = new FormData();
          formData.append("file", resume);
          assertAuthRevision(ownerRevision);
          const fingerprint = await prepareResumeUpload(resume, ownerRevision);
          uploadOperation.current = resumeOperationKey(fingerprint, ownerRevision);
          assertAuthRevision(ownerRevision);
          const receipt = await extractResumeMutation.mutateAsync(formData);
          assertAuthRevision(ownerRevision);

          rememberResumeReceipt(receipt, ownerRevision);
          assertResumeDataSaved(receipt);
          savedResume.current = resume;
          toast.success(
            "Resume data saved. The original file may take longer to appear in Profile."
          );
        } catch (error: unknown) {
          if (getAuthRevision() !== ownerRevision) return;
          const serverMessage = extractApiErrorMessage(
            error,
            "Failed to process resume. Please ensure the file is an unencrypted, valid PDF."
          );
          setResumeError(serverMessage);
          return; // Stop submission so candidate can read the error and re-upload or remove the file
        }
      }

      // Pass data to parent component for profile API call
      if (getAuthRevision() !== ownerRevision) return;
      await onNext({
        target_position: role,
        years_experience: experience,
      });
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeError(null);
      const fileName = file.name.toLowerCase();
      const isPdfExt = fileName.endsWith(".pdf");
      const isPdfMime = !file.type || file.type === "application/pdf";

      // Check file type - only allow PDF
      if (!isPdfExt || !isPdfMime) {
        setResumeError(`Invalid file format (${file.name}). Only .pdf files are allowed.`);
        e.target.value = "";
        setResume(null);
        return;
      }

      // Check file size
      if (file.size > MAX_RESUME_SIZE_MB * 1024 * 1024) {
        setResumeError(
          `File size exceeds ${MAX_RESUME_SIZE_MB}MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller PDF.`
        );
        e.target.value = "";
        setResume(null);
        return;
      }

      setResume(file);
    }
  };

  const handleRemoveResume = () => {
    setResume(null);
    setResumeError(null);
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div>
      <PageHeading
        title="What are you working towards?"
        description="Choose a target role. Your resume is optional—you can add it later."
      />
      <div className="studio-panel">
        {/* Target Role Dropdown */}
        <div className="mb-6">
          <label
            htmlFor="onboarding-role"
            className="block mb-3 text-[16px] font-noto font-[600] text-gray-800"
          >
            Target Position / Role
          </label>
          <select
            id="onboarding-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isLoadingProfiles || isSubmitting || isLoading}
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
                  <option key={profile.id} value={profile.title}>
                    {profile.title}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Experience Dropdown */}
        <div className="mb-6">
          <label
            htmlFor="onboarding-experience"
            className="block mb-3 text-[16px] font-noto font-[600] text-gray-800"
          >
            Years of Experience
          </label>
          <select
            id="onboarding-experience"
            disabled={isSubmitting || isLoading}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="select select-bordered w-full h-[60px] text-gray-800 font-noto text-[16px] rounded-xl"
          >
            <option value="" disabled>
              Select Years of Experience
            </option>
            {experiences.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "0" ? "0 (Fresher)" : `${opt} year${opt === "1" ? "" : "s"}`}
              </option>
            ))}
          </select>
        </div>

        <ResumeStorageRecovery />
        {/* Resume Upload */}
        <div className="mb-6">
          <label
            htmlFor="onboarding-resume"
            className="block mb-3 text-[16px] font-noto font-[600] text-gray-800"
          >
            Resume (Optional, PDF only, Max {MAX_RESUME_SIZE_MB}MB)
          </label>
          <input
            id="onboarding-resume"
            disabled={isSubmitting || isLoading}
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
                disabled={isSubmitting || isLoading}
                title="Remove file"
                aria-label="Remove resume"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
          {resumeError && (
            <p role="alert" className="mt-2 text-sm text-error font-medium">
              {resumeError}
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            !role || !experience || isLoading || isSubmitting || extractResumeMutation.isPending
          }
          className={`flex-1 py-6 rounded-xl btn btn-neutral btn-block mt-6 ${
            role && experience && !isLoading && !extractResumeMutation.isPending
              ? " hover:shadow-lg"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {isLoading || isSubmitting || extractResumeMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="loading loading-spinner loading-md"></span>
              {extractResumeMutation.isPending ? "Processing Resume..." : "Creating Profile..."}
            </span>
          ) : (
            "Open my studio"
          )}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading || isSubmitting || extractResumeMutation.isPending}
          className="btn btn-outline mt-3 w-full"
        >
          Back to education
        </button>
      </div>
    </div>
  );
}
