"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for the auth status to be determined
    if (loading) return;

    if (!user) {
      // This should ideally be handled by middleware, but kept as a fallback
      router.push("/auth/signup");
      return;
    }

    if (user.authorizedUser.isOnboarded) {
      router.push("/home");
    } else {
      router.push("/onboarding");
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="skeleton w-24 h-24 rounded-full bg-base-300"></div>
      <div className="flex flex-col gap-3 items-center w-full max-w-xs">
        <div className="skeleton h-6 w-3/4 bg-base-300"></div>
        <div className="skeleton h-4 w-1/2 bg-base-300"></div>
      </div>
    </div>
  );
}
