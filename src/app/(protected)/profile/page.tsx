"use client";

import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";

import {
  prepareResumeUpload,
  rememberResumeReceipt,
  resumeOperationKey,
} from "@/lib/resume-storage-recovery";
import { assertResumeDataSaved } from "@/lib/resume-readiness";
import ResumeStorageRecovery from "@/components/resume/ResumeStorageRecovery";
import GraduationStatus from "@/components/graduation/GraduationStatus";
import MyCourses from "@/components/placement/MyCourses";
import AboutMyWork from "@/components/profile/AboutMyWork";
import ExtraSupport from "@/components/profile/ExtraSupport";
import WhatsAppUpdates from "@/components/profile/WhatsAppUpdates";
import PageHeading from "@/components/studio/PageHeading";
import { useAuth } from "@/components/providers/auth-provider";
import { createApiClient, ENDPOINTS, extractApiErrorMessage } from "@/lib/api-config";
import { APIService } from "@/lib/api-config/src/config";
import {
  APP_VERSION,
  DEGREE_OPTIONS,
  EXPERIENCE_OPTIONS,
  MAX_PROFILE_RESUME_SIZE_MB,
  ROLE_OPTIONS,
  UNIVERSITY_OPTIONS,
} from "@/lib/constants";
import {
  trackProfileEditButtonClick,
  trackProfileFieldValueChanged,
  trackProfileSupportButtonClick,
  trackProfileUpdateButtonClick,
} from "@/lib/posthog/tracking.utils";
import { getInitials } from "@/lib/utils";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { ArrowLeftStartOnRectangleIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { accountJson } from "@/lib/account-request";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { ProfileFieldRow } from "./_components/ProfileFieldRow";
import { ProfileSkeleton } from "./_components/ProfileSkeleton";
import { VoiceSelector } from "./_components/VoiceSelector";

const usersApiClient = createApiClient(APIService.USERS);
const resumeApiClient = createApiClient(APIService.RESUME);

const profileSchema = z.object({
  targetPosition: z.string().min(1, "Target position is required"),
  yearsExperience: z.string().min(1, "Experience level is required"),
  degree: z.string().min(1, "Degree is required"),
  university: z.string().min(1, "University is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type EditableField = keyof ProfileFormData | "resume";

export default function ProfilePage() {
  const ownerRevision = useRef(getAuthRevision()).current;
  const uploadOperation = useRef("");
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [customUniversity, setCustomUniversity] = useState("");
  const [tempData, setTempData] = useState<ProfileFormData>({
    targetPosition: "",
    yearsExperience: "",
    degree: "",
    university: "",
  });
  const [errors, setErrors] = useState<Partial<Record<EditableField, string>>>({});
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);

  // Force refetch on mount to ensure resumes are always up to date
  // when navigating via client-side router
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: [ENDPOINTS.AUTH.ABOUT_ME] });
  }, [queryClient]);

  const handleViewResume = async () => {
    setIsDownloadingResume(true);
    try {
      const data = await accountJson<{ url?: string }>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.RESUME.DOWNLOAD_ORIGINAL}`,
        ownerRevision
      );
      assertAuthRevision(ownerRevision);
      if (data?.url) {
        const url = new URL(data.url);
        if (url.protocol !== "https:") throw new Error("Invalid download URL");
        window.open(url.href, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No URL returned from backend");
      }
    } catch (error) {
      if (getAuthRevision() !== ownerRevision) return;
      console.error("View resume error:", error);
      toast.error("Could not load resume. Try again.");
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const userInitials = getInitials(user?.authorizedUser?.name || "User");

  const updateProfileMutation = usersApiClient.useMutation({
    url: ENDPOINTS.USERS.PROFILE,
    method: "put",
    successMessage: "Profile updated successfully!",
    showToastError: false,
    keyToInvalidate: {
      queryKey: [ENDPOINTS.AUTH.ABOUT_ME],
    },
  });

  // Upload a new resume → POST /extract-resume (same as onboarding)
  const extractResumeMutation = resumeApiClient.useMutation({
    url: ENDPOINTS.RESUME.EXTRACT,
    method: "post",

    showToastError: false,
    keyToInvalidate: { queryKey: [ENDPOINTS.AUTH.ABOUT_ME] },
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

  // Replace with ATS resume → POST /resume/set-active-resume
  const setActiveResumeMutation = resumeApiClient.useMutation({
    url: ENDPOINTS.RESUME.SET_ACTIVE,
    method: "post",
    successMessage: "ATS resume is now your active resume!",
    showToastError: false,
    keyToInvalidate: { queryKey: [ENDPOINTS.AUTH.ABOUT_ME] },
  });

  const startEditing = (field: EditableField) => {
    trackProfileEditButtonClick(field);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setAtsError(null);
    if (field === "university") {
      const currentUniversity = user?.authorizedUser.university || "";
      const isCustom =
        currentUniversity &&
        !UNIVERSITY_OPTIONS.includes(currentUniversity as (typeof UNIVERSITY_OPTIONS)[number]);
      setTempData((prev) => ({
        ...prev,
        university: isCustom ? "Others" : currentUniversity,
      }));
      setCustomUniversity(isCustom ? currentUniversity : "");
    } else if (field !== "resume") {
      const fieldValues: Record<string, string> = {
        targetPosition: user?.authorizedUser.targetPosition || "",
        yearsExperience: user?.authorizedUser.yearsExperience?.toString() || "",
        degree: user?.authorizedUser.degree || "",
      };
      setTempData((prev) => ({ ...prev, [field]: fieldValues[field] }));
    }
    setEditingField(field);
  };

  const cancelEditing = () => {
    if (editingField) {
      setErrors((prev) => ({ ...prev, [editingField]: undefined }));
    }
    if (editingField === "resume") setResumeFile(null);
    setAtsError(null);
    setCustomUniversity("");
    setEditingField(null);
  };

  const handleFieldSave = async (field: EditableField) => {
    trackProfileUpdateButtonClick(field);
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field !== "resume") {
      const fieldValidation = profileSchema.pick({ [field]: true } as any);
      const validationResult = fieldValidation.safeParse({
        [field]: tempData[field],
      });

      if (!validationResult.success) {
        const fieldError = validationResult.error.issues[0]?.message;
        if (fieldError) {
          setErrors((prev) => ({ ...prev, [field]: fieldError }));
          return;
        }
      }
    }

    if (field === "resume") {
      if (!resumeFile) {
        setErrors((prev) => ({
          ...prev,
          resume: "Select a resume file (.pdf) before saving.",
        }));
        return;
      }

      const fileName = resumeFile.name.toLowerCase();
      const isPdfExt = fileName.endsWith(".pdf");
      const isPdfMime = !resumeFile.type || resumeFile.type === "application/pdf";

      if (!isPdfExt || !isPdfMime) {
        setErrors((prev) => ({
          ...prev,
          resume: `Invalid file format (${resumeFile.name}). Only PDF files (.pdf) are allowed.`,
        }));
        return;
      }

      if (resumeFile.size > MAX_PROFILE_RESUME_SIZE_MB * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          resume: `File size exceeds ${MAX_PROFILE_RESUME_SIZE_MB}MB limit (selected: ${(resumeFile.size / (1024 * 1024)).toFixed(1)}MB).`,
        }));
        return;
      }

      // Upload via POST /extract-resume (same as onboarding, overwrites onboarding resume)
      setIsUploadingResume(true);
      try {
        const formData = new FormData();
        formData.append("file", resumeFile);
        assertAuthRevision(ownerRevision);
        const fingerprint = await prepareResumeUpload(resumeFile, ownerRevision);
        uploadOperation.current = resumeOperationKey(fingerprint, ownerRevision);
        assertAuthRevision(ownerRevision);
        const receipt = await extractResumeMutation.mutateAsync(formData);
        assertAuthRevision(ownerRevision);

        rememberResumeReceipt(receipt, ownerRevision);
        assertResumeDataSaved(receipt);
        toast.success("Resume data saved. The original file may take longer to appear in Profile.");
        setResumeFile(null);
        setEditingField(null);
      } catch (error) {
        if (getAuthRevision() !== ownerRevision) return;
        console.error("Resume upload failed:", error);
        setErrors((prev) => ({
          ...prev,
          resume: extractApiErrorMessage(
            error,
            "Failed to parse resume. Ensure the file is an unencrypted, valid PDF."
          ),
        }));
      } finally {
        setIsUploadingResume(false);
      }
      return;
    }

    const submitData = new FormData();
    const value =
      field === "university" && tempData.university === "Others"
        ? customUniversity
        : tempData[field];

    submitData.append(
      field === "targetPosition"
        ? "target_position"
        : field === "yearsExperience"
          ? "years_experience"
          : field,
      value
    );

    try {
      await updateProfileMutation.mutateAsync(submitData);
      setEditingField(null);
    } catch (error) {
      if (getAuthRevision() !== ownerRevision) return;
      console.error(`Field update failed for ${field}:`, error);
      setErrors((prev) => ({
        ...prev,
        [field]: extractApiErrorMessage(error, `Failed to update ${field}. Try again.`),
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrors((prev) => ({ ...prev, resume: undefined }));

    const fileName = file.name.toLowerCase();
    const isPdfExt = fileName.endsWith(".pdf");
    const isPdfMime = !file.type || file.type === "application/pdf";

    if (!isPdfExt || !isPdfMime) {
      setErrors((prev) => ({
        ...prev,
        resume: `Invalid file format (${file.name}). Only .pdf files are allowed. Rename or select a valid PDF file.`,
      }));
      e.target.value = "";
      setResumeFile(null);
      return;
    }

    if (file.size > MAX_PROFILE_RESUME_SIZE_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        resume: `File size exceeds ${MAX_PROFILE_RESUME_SIZE_MB}MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(1)}MB). Upload a smaller PDF.`,
      }));
      e.target.value = "";
      setResumeFile(null);
      return;
    }

    setResumeFile(file);
  };

  const handleInputChange = (field: string, value: string) => {
    trackProfileFieldValueChanged(field, value);
    setTempData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as EditableField]) {
      setErrors((prev) => ({ ...prev, [field as EditableField]: undefined }));
    }
  };

  const handleSupportClick = () => {
    trackProfileSupportButtonClick();
    const phoneNumber = "+918639322365";
    const message = "Hi, I need support with Samvaad Saathi app.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener");
  };

  if (!user) return <ProfileSkeleton />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <PageHeading
        eyebrow="Your account"
        title="Your profile"
        description="Your details and the interview voice."
      />
      <ResumeStorageRecovery />
      {/* Who you are comes first; courses and support details follow it. */}
      <section className="studio-profile-card" aria-label="Your details">
        <div className="studio-profile-identity">
          <div className="studio-profile-avatar" aria-hidden="true">
            {userInitials}
          </div>
          <div>
            <h2>{user.authorizedUser.name}</h2>
            <p className="studio-muted">
              {user.authorizedUser.targetPosition || "Add the role you’re preparing for"}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center font-semibold gap-8 text-primary">
          <span>Interviews attempted</span>
          <span>{user.authorizedUser.totalAttempts ?? "Not available"}</span>
        </div>
      </section>
      <MyCourses />
      <GraduationStatus />
      <AboutMyWork />
      <WhatsAppUpdates />
      <ExtraSupport />
      <section className="studio-profile-card">
        {/* Profile Information */}
        <div className="space-y-4 my-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-brand-navy">{"Profile information"}</h2>
          </div>

          <div className="grid gap-x-8 md:grid-cols-2">
            <ProfileFieldRow
              label="Target position"
              value={<>{user.authorizedUser.targetPosition || "Not specified"}</>}
              locked={editingField !== null && editingField !== "targetPosition"}
              onSave={() => handleFieldSave("targetPosition")}
              saving={
                updateProfileMutation.isPending ||
                extractResumeMutation.isPending ||
                isUploadingResume
              }
              isEditing={editingField === "targetPosition"}
              onEdit={() => startEditing("targetPosition")}
              onCancel={cancelEditing}
              error={errors.targetPosition}
              errorId="profile-targetPosition-error"
            >
              <select
                aria-label="Target position"
                aria-invalid={!!errors.targetPosition}
                aria-describedby={
                  errors.targetPosition ? "profile-targetPosition-error" : undefined
                }
                disabled={editingField !== "targetPosition"}
                className={`select select-bordered w-full ${errors.targetPosition ? "select-error" : ""}`}
                value={
                  editingField === "targetPosition"
                    ? tempData.targetPosition
                    : user.authorizedUser.targetPosition || ""
                }
                onChange={(e) => handleInputChange("targetPosition", e.target.value)}
              >
                <option value="" disabled>
                  Not specified
                </option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </ProfileFieldRow>

            <ProfileFieldRow
              label="Years of experience"
              value={
                <>
                  {user.authorizedUser.yearsExperience == null
                    ? "Not specified"
                    : user.authorizedUser.yearsExperience === 0
                      ? "Fresher"
                      : `${user.authorizedUser.yearsExperience} ${user.authorizedUser.yearsExperience === 1 ? "year" : "years"}`}
                </>
              }
              locked={editingField !== null && editingField !== "yearsExperience"}
              onSave={() => handleFieldSave("yearsExperience")}
              saving={
                updateProfileMutation.isPending ||
                extractResumeMutation.isPending ||
                isUploadingResume
              }
              isEditing={editingField === "yearsExperience"}
              onEdit={() => startEditing("yearsExperience")}
              onCancel={cancelEditing}
              error={errors.yearsExperience}
              errorId="profile-yearsExperience-error"
            >
              <select
                aria-label="Years of experience"
                aria-invalid={!!errors.yearsExperience}
                aria-describedby={
                  errors.yearsExperience ? "profile-yearsExperience-error" : undefined
                }
                disabled={editingField !== "yearsExperience"}
                className={`select select-bordered w-full ${errors.yearsExperience ? "select-error" : ""}`}
                value={
                  editingField === "yearsExperience"
                    ? tempData.yearsExperience
                    : user.authorizedUser.yearsExperience?.toString() || ""
                }
                onChange={(e) => handleInputChange("yearsExperience", e.target.value)}
              >
                <option value="" disabled>
                  Not specified
                </option>
                {EXPERIENCE_OPTIONS.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp === "0" ? "0 (Fresher)" : `${exp} year${exp === "1" ? "" : "s"}`}
                  </option>
                ))}
              </select>
            </ProfileFieldRow>

            <ProfileFieldRow
              label="Degree"
              value={<>{user.authorizedUser.degree || "Not specified"}</>}
              locked={editingField !== null && editingField !== "degree"}
              onSave={() => handleFieldSave("degree")}
              saving={
                updateProfileMutation.isPending ||
                extractResumeMutation.isPending ||
                isUploadingResume
              }
              isEditing={editingField === "degree"}
              onEdit={() => startEditing("degree")}
              onCancel={cancelEditing}
              error={errors.degree}
              errorId="profile-degree-error"
            >
              <select
                aria-label="Degree"
                aria-invalid={!!errors.degree}
                aria-describedby={errors.degree ? "profile-degree-error" : undefined}
                disabled={editingField !== "degree"}
                className={`select select-bordered w-full ${errors.degree ? "select-error" : ""}`}
                value={
                  editingField === "degree" ? tempData.degree : user.authorizedUser.degree || ""
                }
                onChange={(e) => handleInputChange("degree", e.target.value)}
              >
                <option value="" disabled>
                  Not specified
                </option>
                {DEGREE_OPTIONS.map((degree) => (
                  <option key={degree} value={degree}>
                    {degree}
                  </option>
                ))}
              </select>
            </ProfileFieldRow>

            <ProfileFieldRow
              label="University"
              value={<>{user.authorizedUser.university || "Not specified"}</>}
              locked={editingField !== null && editingField !== "university"}
              onSave={() => handleFieldSave("university")}
              saving={
                updateProfileMutation.isPending ||
                extractResumeMutation.isPending ||
                isUploadingResume
              }
              isEditing={editingField === "university"}
              onEdit={() => startEditing("university")}
              onCancel={cancelEditing}
              error={errors.university}
              errorId="profile-university-error"
            >
              <>
                <select
                  aria-label="University"
                  aria-invalid={!!errors.university}
                  aria-describedby={errors.university ? "profile-university-error" : undefined}
                  disabled={editingField !== "university"}
                  className={`select select-bordered w-full ${errors.university ? "select-error" : ""}`}
                  value={
                    editingField === "university"
                      ? tempData.university
                      : user.authorizedUser.university || ""
                  }
                  onChange={(e) => {
                    handleInputChange("university", e.target.value);
                    if (e.target.value !== "Others") setCustomUniversity("");
                  }}
                >
                  <option value="" disabled>
                    Not specified
                  </option>
                  {UNIVERSITY_OPTIONS.map((university) => (
                    <option key={university} value={university}>
                      {university}
                    </option>
                  ))}
                </select>
                {editingField === "university" && tempData.university === "Others" && (
                  <input
                    type="text"
                    aria-label="University name"
                    placeholder="Enter university name"
                    className={`input input-bordered w-full mt-2 ${errors.university ? "input-error" : ""}`}
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                  />
                )}
              </>
            </ProfileFieldRow>

            <ProfileFieldRow
              label="Onboarding resume"
              value={
                <>
                  {user.authorizedUser.onboardingResumeFilename ||
                    (user.authorizedUser.hasResume ? "Resume uploaded" : "No resume uploaded")}
                </>
              }
              locked={editingField !== null && editingField !== "resume"}
              onSave={() => handleFieldSave("resume")}
              saving={
                updateProfileMutation.isPending ||
                extractResumeMutation.isPending ||
                isUploadingResume
              }
              isEditing={editingField === "resume"}
              onEdit={() => startEditing("resume")}
              onCancel={cancelEditing}
            >
              <>
                <div className="w-full flex flex-col gap-2">
                  {editingField !== "resume" ? (
                    // View mode: show filename from /me response
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-base-100">
                      <DocumentTextIcon className="size-5 text-gray-500" />
                      <span className="text-sm truncate flex-1">
                        {user.authorizedUser.onboardingResumeFilename ||
                          (user.authorizedUser.hasResume
                            ? "Resume uploaded"
                            : "No resume uploaded")}
                      </span>
                      {/* View button completely removed per user request */}
                    </div>
                  ) : (
                    // Edit mode: two options
                    <div className="flex flex-col gap-3">
                      {/* Option 1: Upload a new resume → POST /extract-resume */}
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-gray-500">
                          Upload a new resume (PDF only, max 5MB, replaces current)
                        </p>
                        <input
                          type="file"
                          aria-label="Upload onboarding resume"
                          className={`file-input file-input-sm w-full ${errors.resume ? "file-input-error" : ""}`}
                          accept=".pdf,application/pdf"
                          onChange={handleFileChange}
                        />
                        {errors.resume && (
                          <span className="label-text-alt text-error font-medium mt-1">
                            {errors.resume}
                          </span>
                        )}
                        {resumeFile && !errors.resume && (
                          <span className="label-text-alt text-success flex items-center gap-1 mt-1">
                            <DocumentTextIcon className="size-3" />
                            {resumeFile.name} selected
                          </span>
                        )}
                      </div>

                      {/* Option 2: Replace with ATS resume → POST /resume/set-active-resume */}
                      {/* Always shown; disabled with tooltip when no ATS resume */}
                      <>
                        <div className="divider my-0 text-sm text-gray-400">OR</div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-gray-500">
                            {user.authorizedUser.atsResumeId
                              ? "Use your final ATS resume for interviews"
                              : "Complete the ATS feature to unlock this"}
                          </p>
                          <button
                            type="button"
                            disabled={
                              !user.authorizedUser.atsResumeId || setActiveResumeMutation.isPending
                            }
                            title={!user.authorizedUser.atsResumeId ? "No ATS resume yet" : ""}
                            onClick={async () => {
                              if (!user.authorizedUser.atsResumeId) return;
                              setAtsError(null);
                              try {
                                await setActiveResumeMutation.mutateAsync({
                                  user_resume_id: user.authorizedUser.atsResumeId,
                                });
                                setEditingField(null);
                              } catch (error) {
                                if (getAuthRevision() !== ownerRevision) return;
                                console.error("Failed to set ATS resume as active:", error);
                                setAtsError(
                                  extractApiErrorMessage(
                                    error,
                                    "Failed to set ATS resume as active."
                                  )
                                );
                              }
                            }}
                            className="btn btn-sm btn-outline btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {setActiveResumeMutation.isPending ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              "Replace with ATS resume"
                            )}
                          </button>
                          {atsError && (
                            <span className="label-text-alt text-error font-medium mt-1">
                              {atsError}
                            </span>
                          )}
                        </div>
                      </>
                    </div>
                  )}
                </div>
              </>
            </ProfileFieldRow>

            {/* The ATS resume is made in the resume tool, so this row has no Edit. */}
            <div className="min-w-0 border-t border-brand-line py-4">
              <p className="text-sm font-semibold text-brand-muted">{"ATS resume (final)"}</p>
              <p className="mt-1 flex items-center gap-2 break-words text-base font-medium text-brand-navy">
                <DocumentTextIcon className="size-5 shrink-0 text-brand-muted" aria-hidden="true" />
                {user.authorizedUser.atsResumeFilename ||
                  (user.authorizedUser as { ats_resume_filename?: string }).ats_resume_filename ||
                  "No ATS resume yet"}
              </p>
            </div>

            <VoiceSelector />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pb-6">
          {/* "Help" used to open the YouTube home page. Support on WhatsApp is the real help. */}
          <button
            type="button"
            onClick={handleSupportClick}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-line font-semibold text-brand-navy hover:bg-brand-wash"
          >
            <ChatBubbleLeftRightIcon className="size-6" aria-hidden="true" />
            Get help on WhatsApp
          </button>

          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold text-brand-danger hover:bg-brand-danger-wash"
          >
            <ArrowLeftStartOnRectangleIcon className="size-6" aria-hidden="true" />
            Log out
          </button>
        </div>

        <p className="text-center text-sm text-brand-muted">Samvaad Saathi v{APP_VERSION}</p>
      </section>
    </div>
  );
}
