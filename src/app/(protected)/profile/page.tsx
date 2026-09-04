"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ENDPOINTS } from "@/lib/api-config";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import {
  APP_VERSION,
  DEGREE_OPTIONS,
  EXPERIENCE_OPTIONS,
  MAX_PROFILE_RESUME_SIZE_MB,
  RESUME_FILE_TYPES,
  ROLE_OPTIONS,
  UNIVERSITY_OPTIONS,
} from "@/lib/constants";
import {
  trackProfileEditButtonClick,
  trackProfileFieldValueChanged,
  trackProfileHelpButtonClick,
  trackProfileSupportButtonClick,
  trackProfileUpdateButtonClick,
} from "@/lib/posthog/tracking.utils";
import { getInitials } from "@/lib/utils";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import {
  ArrowLeftStartOnRectangleIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getTokenFromCookies } from "@/lib/token-utils";
import { z } from "zod";

import { ProfileFieldRow } from "./_components/ProfileFieldRow";
import { ProfileSkeleton } from "./_components/ProfileSkeleton";
import { VoiceSelector } from "./_components/VoiceSelector";

const usersApiClient = createApiClient(APIService.USERS);

const profileSchema = z.object({
  targetPosition: z.string().min(1, "Target position is required"),
  yearsExperience: z.string().min(1, "Experience level is required"),
  degree: z.string().min(1, "Degree is required"),
  university: z.string().min(1, "University is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type EditableField = keyof ProfileFormData | "resume";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [customUniversity, setCustomUniversity] = useState("");
  const [tempData, setTempData] = useState<ProfileFormData>({
    targetPosition: "",
    yearsExperience: "",
    degree: "",
    university: "",
  });
  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});

  const userInitials = getInitials(user?.authorizedUser?.name || "User");

  const updateProfileMutation = usersApiClient.useMutation({
    url: ENDPOINTS.USERS.PROFILE,
    method: "put",
    successMessage: "Profile updated successfully!",
    errorMessage: "Failed to update profile. Please try again.",
    keyToInvalidate: {
      queryKey: [ENDPOINTS.AUTH.ABOUT_ME],
    },
  });

  const startEditing = (field: EditableField) => {
    trackProfileEditButtonClick(field);
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
    if (editingField && editingField !== "resume") {
      setErrors((prev) => ({ ...prev, [editingField]: undefined }));
    }
    if (editingField === "resume") setResumeFile(null);
    setCustomUniversity("");
    setEditingField(null);
  };

  const handleFieldSave = async (field: EditableField) => {
    trackProfileUpdateButtonClick(field);

    if (field !== "resume") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));

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

    const submitData = new FormData();

    if (field === "resume") {
      if (!resumeFile) {
        setEditingField(null);
        return;
      }
      submitData.append("resume", resumeFile);
    } else {
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
    }

    try {
      await updateProfileMutation.mutateAsync(submitData);
      
      if (field === "resume") {
        let retries = 10;
        let hasResume = false;
        toast.loading("Processing resume...", { id: "resume-poll" });
        while (retries > 0 && !hasResume) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const token = getTokenFromCookies();
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.AUTH.ABOUT_ME}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userData = await res.json();
          if (userData?.authorizedUser?.hasResume) {
            hasResume = true;
          }
          retries--;
        }
        toast.dismiss("resume-poll");
        setResumeFile(null);
      }
      
      setEditingField(null);
    } catch (error) {
      if (field === "resume") toast.dismiss("resume-poll");
      console.error(`Field update failed for ${field}:`, error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= MAX_PROFILE_RESUME_SIZE_MB * 1024 * 1024) {
      setResumeFile(file);
    } else if (file) {
      alert(`File size must be less than ${MAX_PROFILE_RESUME_SIZE_MB}MB`);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    trackProfileFieldValueChanged(field, value);
    setTempData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ProfileFormData]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleHelpClick = () => {
    trackProfileHelpButtonClick();
    window.open("https://www.youtube.com", "_blank");
  };

  const handleSupportClick = () => {
    trackProfileSupportButtonClick();
    const phoneNumber = "+918639322365";
    const message = "Hi, I need support with Samvaad Saathi app.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (!user) return <ProfileSkeleton />;

  return (
    <main className="max-w-md mx-auto">
      <section className=" ">
        {/* Avatar */}
        <div className="card-body items-center text-center">
          <div className="avatar avatar-placeholder">
            <div className="bg-primary text-neutral-content w-12 rounded-full">
              <span className="text-xl">{userInitials}</span>
            </div>
          </div>
          <h2 className="card-title text-2xl">{user.authorizedUser.name}</h2>
          <p className="text-base-content/70">
            {user.authorizedUser.targetPosition || "No position set"}
          </p>
        </div>

        <div className="flex justify-between items-center font-semibold gap-8 text-primary">
          <span>Interviews attempted:</span>
          <span>{user.authorizedUser.totalAttempts ?? 0}</span>
        </div>

        <div className="divider" />

        {/* Profile Information */}
        <div className="space-y-4 my-4">
          <div className="flex justify-between items-center">
            <h3 className="card-title">Profile Information</h3>
            {editingField !== null && (
              <button
                onClick={() => handleFieldSave(editingField)}
                className="btn btn-xs btn-success"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Update"}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <ProfileFieldRow
              label="Target Position"
              isEditing={editingField === "targetPosition"}
              onEdit={() => startEditing("targetPosition")}
              onCancel={cancelEditing}
              error={errors.targetPosition}
            >
              <select
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
              label="Years of Experience"
              isEditing={editingField === "yearsExperience"}
              onEdit={() => startEditing("yearsExperience")}
              onCancel={cancelEditing}
              error={errors.yearsExperience}
            >
              <select
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
              isEditing={editingField === "degree"}
              onEdit={() => startEditing("degree")}
              onCancel={cancelEditing}
              error={errors.degree}
            >
              <select
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
              isEditing={editingField === "university"}
              onEdit={() => startEditing("university")}
              onCancel={cancelEditing}
              error={errors.university}
            >
              <>
                <select
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
                    placeholder="Enter university name"
                    className={`input input-bordered w-full mt-2 ${errors.university ? "input-error" : ""}`}
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                  />
                )}
              </>
            </ProfileFieldRow>

            <ProfileFieldRow
              label={`Resume (Optional, Max ${MAX_PROFILE_RESUME_SIZE_MB}MB)`}
              isEditing={editingField === "resume"}
              onEdit={() => startEditing("resume")}
              onCancel={cancelEditing}
            >
              <>
                <div className="w-full">
                  <input
                    type="file"
                    disabled={editingField !== "resume"}
                    className="file-input w-full"
                    accept={RESUME_FILE_TYPES}
                    onChange={handleFileChange}
                  />
                </div>
                {editingField === "resume" && resumeFile && (
                  <label className="label">
                    <span className="label-text-alt text-success flex items-center gap-1">
                      <DocumentTextIcon className="size-3" />
                      File selected successfully
                    </span>
                  </label>
                )}
              </>
            </ProfileFieldRow>

            <VoiceSelector />
          </div>
        </div>

        {/* Actions */}
        <div className="card-actions flex-col space-y-2 pb-6">
          <div className="flex items-center gap-10 justify-between w-full">
            <button onClick={handleHelpClick} className="btn btn-ghost justify-center flex-1">
              <QuestionMarkCircleIcon className="size-6" />
              Help
            </button>
            <button onClick={handleSupportClick} className="btn btn-ghost justify-center flex-1">
              <ChatBubbleLeftRightIcon className="size-6" />
              Support
            </button>
          </div>

          <button onClick={signOut} className="btn btn-soft btn-error w-full justify-start">
            <ArrowLeftStartOnRectangleIcon className="size-6" />
            Log Out
          </button>
        </div>

        <p className="text-center text-sm text-gray-500">Samvaad Saathi v{APP_VERSION}</p>
      </section>
    </main>
  );
}
