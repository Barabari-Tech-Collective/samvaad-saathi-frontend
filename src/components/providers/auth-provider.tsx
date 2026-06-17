"use client";

import { apiClient, ENDPOINTS } from "@/lib/api-config";
import { identifyUser, resetUser, trackLogoutButtonClick } from "@/lib/posthog/tracking.utils";
import { UserProfile } from "@/lib/types/user";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { useCookies } from "react-cookie";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInWithCognito: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cookies, , removeCookie] = useCookies(["token", "refresh_token"]);

  const { data: user, isLoading: loading } = apiClient.useQuery<UserProfile>({
    key: [ENDPOINTS.AUTH.ABOUT_ME],
    url: ENDPOINTS.AUTH.ABOUT_ME,
    // Only make the query if we have a token
    enabled: !!cookies.token,
  });

  // Handle user identification and onboarding redirect
  useEffect(() => {
    if (user && !loading) {
      const userProperties = {
        email: user.authorizedUser.email,
        name: user.authorizedUser.name,
        degree: user.authorizedUser.degree,
        university: user.authorizedUser.university,
        target_position: user.authorizedUser.targetPosition,
        years_experience: user.authorizedUser.yearsExperience,
        is_onboarded: user.authorizedUser.isOnboarded,
        total_attempts: user.authorizedUser.totalAttempts,
        created_at: user.authorizedUser.createdAt,
      };

      identifyUser(user.userId, userProperties);

      // If user is NOT onboarded, redirect to onboarding if not already there
      if (!user.authorizedUser.isOnboarded && window.location.pathname !== "/onboarding") {
        router.push("/onboarding");
      }
    }
  }, [user, loading, router]);

  const signInWithCognito = () => {
    window.location.href = `api${ENDPOINTS.AUTH.COGNITO_LOGIN}`;
  };

  const signOut = () => {
    // Track logout event
    trackLogoutButtonClick();

    // Reset user identification in PostHog
    resetUser();

    // Clear all cookies
    removeCookie("token", { path: "/" });
    removeCookie("refresh_token", { path: "/" });

    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.clear();
    }

    // Clear sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }

    // Clear all query cache
    queryClient.clear();

    // Redirect to signup page
    router.push("/auth/signup");
  };

  const value: AuthContextType = {
    user: user ?? null,
    loading,
    signInWithCognito,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
