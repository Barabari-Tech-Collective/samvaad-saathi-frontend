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
import FirstSetup from "./_components/first-setup";

// Create USERS API client
const usersApiClient = createApiClient(APIService.USERS);

export default function Onboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Set up mutation for profile update
  const updateProfileMutation = usersApiClient.useMutation({
    url: ENDPOINTS.USERS.PROFILE,
    method: "put",
    errorMessage: "We couldn't save that. Please try again.",
    options: {
      onSuccess: async () => {
        const revision = getAuthRevision();
        await queryClient.invalidateQueries({ queryKey: [ENDPOINTS.AUTH.ABOUT_ME] });
        assertAuthRevision(revision);
        // A brand-new learner should be speaking within a minute, not reading a dashboard.
        const returnTo = new URLSearchParams(window.location.search).get("return_to");
        router.push(returnTo ? loginDestination(returnTo) : "/warm-up-chat");
      },
    },
  });

  const handleSubmit = async (data: { university: string; target_position: string }) => {
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync(data);
    } catch {
      toast.error("We couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="studio-onboarding">
      <header className="studio-auth-brand">
        <Image src="/barabari_logo.png" width={32} height={32} alt="" />
        <span>Samvaad Saathi</span>
      </header>
      <div className="studio-onboarding-content">
        <FirstSetup onSubmit={handleSubmit} saving={saving} />
      </div>
    </div>
  );
}
