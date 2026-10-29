"use client";
import { ENDPOINTS } from "@/lib/api-config";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { loginDestination } from "@/lib/login-destination";
import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";
import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import Step1 from "./_components/step-1";
import { default as Step2 } from "./_components/step-2";

// Create USERS API client
const usersApiClient = createApiClient(APIService.USERS);

export default function Onboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    degree: "",
    university: "",
    target_position: "",
    years_experience: "",
  });

  // Set up mutation for profile update
  const updateProfileMutation = usersApiClient.useMutation({
    url: ENDPOINTS.USERS.PROFILE,
    method: "put",
    errorMessage: "Failed to create profile. Please try again.",
    options: {
      onSuccess: async () => {
        const revision = getAuthRevision();
        await queryClient.invalidateQueries({ queryKey: [ENDPOINTS.AUTH.ABOUT_ME] });
        assertAuthRevision(revision);
        toast.success("Profile created successfully!");

        router.push(loginDestination(new URLSearchParams(window.location.search).get("return_to")));
      },
    },
  });

  const handleNext = (data: { degree: string; university: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(2);
  };

  const handleSubmit = async (data: { target_position: string; years_experience: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));

    // Create object for the PROFILE API call (no file upload here)
    const submitData = {
      degree: formData.degree,
      university: formData.university,
      target_position: data.target_position,
      years_experience: data.years_experience,
    };
    try {
      await updateProfileMutation.mutateAsync(submitData);
    } catch {
      // Error handling is done by the mutation's onError callback
      toast.error("Profile creation failed. Please try again.");
    }
  };

  return (
    <div className="studio-onboarding">
      <header className="studio-auth-brand">
        <Image src="/barabari_logo.png" width={32} height={32} alt="" />
        <span>Samvaad Saathi</span>
      </header>
      <div className="studio-onboarding-content">
        <ol className="studio-setup-steps" aria-label="Account setup steps">
          <li aria-current={step === 1 ? "step" : undefined}>
            <span>1</span>Education
          </li>
          <li aria-current={step === 2 ? "step" : undefined}>
            <span>2</span>Career
          </li>
        </ol>
        <div hidden={step !== 1}>
          <Step1 onNext={handleNext} />
        </div>
        <div hidden={step !== 2}>
          <Step2
            onNext={handleSubmit}
            onBack={() => setStep(1)}
            isLoading={updateProfileMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
