"use client";

import { apiClient, ENDPOINTS } from "@/lib/api-config";
import { identifyUser, resetUser, trackLogoutButtonClick } from "@/lib/posthog/tracking.utils";
import { UserProfile } from "@/lib/types/user";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { announceAuthChange } from "@/lib/auth-session";
import { clearLogoutStorage } from "@/lib/logout-storage";
import { cookieSessionEnabled } from "@/lib/session-runtime";
import { CookieAuthProvider } from "@/components/providers/cookie-auth-provider";
import { useCookies } from "react-cookie";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  // LEGACY - COGNITO, kept for rollback: signInWithCognito: () => void;
  signInWithSso: () => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function LegacyAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sessionWorkspace = usePathname() === "/auth/session-workspace";
  const queryClient = useQueryClient();
  const [cookies, , removeCookie] = useCookies(["token", "refresh_token"]);

  const { data: user, isLoading: loading } = apiClient.useQuery<UserProfile>({
    key: [ENDPOINTS.AUTH.ABOUT_ME],
    url: ENDPOINTS.AUTH.ABOUT_ME,
    // Only make the query if we have a token
    enabled: !!cookies.token && !sessionWorkspace,
  });

  // Handle user identification and onboarding redirect
  useEffect(() => {
    if (user && !loading && !sessionWorkspace) {
      identifyUser(user.userId, {
        is_onboarded: user.authorizedUser.isOnboarded,
        total_attempts: user.authorizedUser.totalAttempts,
      });

      // If user is NOT onboarded, redirect to onboarding if not already there
      const isBulkAtsStaffRoute =
        user.authorizedUser.canUseBulkAts && window.location.pathname.startsWith("/bulk-ats");
      if (
        !user.authorizedUser.isOnboarded &&
        window.location.pathname !== "/onboarding" &&
        !isBulkAtsStaffRoute
      ) {
        router.push("/onboarding");
      }
    }
  }, [user, loading, router, sessionWorkspace]);

  // LEGACY - COGNITO, kept for rollback:
  // const signInWithCognito = () => {
  //   window.location.href = `api${ENDPOINTS.AUTH.COGNITO_LOGIN}`;
  // };
  const signInWithSso = () => {
    // Must be an absolute URL to the backend. The previous `api${...}` form (inherited
    // from the Cognito helper) produced "apiauth/sso/login" - no separator and no
    // origin - which the browser resolves relative to the current page and 404s on the
    // frontend, never reaching the backend at all. The signup page's <Link> already
    // used this correct form; this helper is the same entry point exposed on the auth
    // context, so it has to agree.
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.AUTH.SSO_LOGIN}`;
  };

  const signOut = () => {
    // Track logout event
    trackLogoutButtonClick();

    // Reset user identification in PostHog
    resetUser();

    // Clear all cookies
    removeCookie("token", { path: "/" });
    removeCookie("refresh_token", { path: "/" });

    announceAuthChange(true);
    clearLogoutStorage();

    // Clear all query cache
    queryClient.clear();

    // Redirect to signup page
    router.push("/auth/signup");
  };

  const value: AuthContextType = {
    user: !sessionWorkspace && cookies.token ? (user ?? null) : null,
    loading,
    signInWithSso,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return cookieSessionEnabled ? <CookieAuthProvider>{children}</CookieAuthProvider> : <LegacyAuthProvider>{children}</LegacyAuthProvider>;
}
