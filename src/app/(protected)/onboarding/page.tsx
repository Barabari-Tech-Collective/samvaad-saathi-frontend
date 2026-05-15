"use client";
import { ENDPOINTS } from "@/lib/api-config";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";
import { AcademicCapIcon, BriefcaseIcon } from "@heroicons/react/24/outline";
import {
  AcademicCapIcon as AcademicCapSolid,
  BriefcaseIcon as BriefcaseSolid,
} from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import Step1 from "./_components/step-1";
import { default as Step2 } from "./_components/step-2";

// Create USERS API client
const usersApiClient = createApiClient(APIService.USERS);

export default function Onboarding() {
  const router = useRouter();
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
      onSuccess: () => {
        toast.success("Profile created successfully!");

        router.push("/home");
      },
    },
  });

  const handleNext = (data: { degree: string; university: string }) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((prev) => prev + 1);
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

  const steps = [
    {
      id: 1,
      icon: AcademicCapIcon,
      iconSolid: AcademicCapSolid,
    },
    {
      id: 2,
      icon: BriefcaseIcon,
      iconSolid: BriefcaseSolid,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header with Stepper */}
      <div className="">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Custom Stepper with Icons Inside */}
          <div className=" max-w-60 mx-auto">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${((step - 1) / (steps.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {/* Step Circles with Icons */}
              {steps.map((stepItem) => {
                const isActive = step === stepItem.id;
                const isCompleted = step > stepItem.id;
                const IconComponent = isCompleted ? stepItem.iconSolid : stepItem.icon;

                return (
                  <div
                    key={stepItem.id}
                    className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? "bg-primary border-primary text-white"
                        : isActive
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        {step === 1 && <Step1 onNext={handleNext} />}
        {step === 2 && <Step2 onNext={handleSubmit} isLoading={updateProfileMutation.isPending} />}
      </div>
    </div>
  );
}
