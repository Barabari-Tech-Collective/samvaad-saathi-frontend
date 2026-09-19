"use client";

import { ENDPOINTS } from "@/lib/api-config";

import {
  trackLoginAttempt,
  trackLoginFailure,
  trackLoginSuccess,
} from "@/lib/posthog/tracking.utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";

export default function SignupPage() {
  const [cookies, setCookie] = useCookies(["token", "refresh_token"]);
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasTrackedLoginAttempt, setHasTrackedLoginAttempt] = useState(false);
  // Central-auth plan, Phase 10: set when auth-service's /authorize denies this student
  // access to Samvaad Saathi specifically (they're authenticated, just not entitled yet).
  // requestCode is the one-time proof-of-identity the denied login left behind — this
  // student has no bearer token at all, since /authorize stopped before ever issuing one.
  const [accessDeniedRequestCode, setAccessDeniedRequestCode] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "submitting" | "submitted" | "error">(
    "idle"
  );

  useEffect(() => {
    const handleTokenExtraction = () => {
      if (typeof window === "undefined") return;

      // First, check if user already has valid tokens in cookies
      const existingToken = cookies.token;
      const existingRefreshToken = cookies.refresh_token;

      if (existingToken && existingRefreshToken) {
        // User already has valid tokens, redirect to home
        router.push("/home");
        return;
      }

      // If no existing tokens, check for tokens in URL query parameters
      const searchParams = window.location.search;
      // auth-service's /authorize and Samvaad Saathi's own /auth/sso/callback both send
      // error/requestCode in the URL *fragment* (#...), not the query string - kept out of
      // server logs and Referer headers that way. token/refresh_token on success still use
      // the query string (matching the original Cognito-era contract this replaced).
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const errorParam = hashParams.get("error");
      if (errorParam === "access_denied") {
        setAccessDeniedRequestCode(hashParams.get("requestCode"));
        return;
      }

      if (!searchParams) return;

      // Extract token and refresh_token from URL query parameters
      const params = new URLSearchParams(searchParams);
      const token = params.get("token");
      const refreshToken = params.get("refresh_token");

      if (token && refreshToken) {
        setIsProcessing(true);

        // Track successful login
        // LEGACY - COGNITO: was trackLoginSuccess("Google") when Cognito Hosted UI only offered
        // Google sign-in. Login now goes through Sampark Saathi's central auth.
        trackLoginSuccess("Sampark Saathi");

        // Set secure cookies with tokens
        const cookieOptions = {
          path: "/",
          secure: process.env.NODE_ENV === "production", // Use secure cookies in production
          sameSite: "strict" as const,
          httpOnly: false, // Set to true if you want httpOnly cookies (but then you can't access them via JS)
          maxAge: 60 * 60 * 24 * 7, // 7 days
        };

        setCookie("token", token, cookieOptions);
        setCookie("refresh_token", refreshToken, cookieOptions);

        // Clear the query parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redirect to root page to let the main routing logic handle the redirect
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else if (hasTrackedLoginAttempt) {
        // If we tracked a login attempt but no tokens were received, track failure
        // LEGACY - COGNITO: was trackLoginFailure(error || "google_login_error"), reading
        // from window.location.search - errors were never actually in the query string
        // (see hashParams above), so this always silently fell through to the fallback.
        trackLoginFailure(errorParam || "sso_login_error");
      }
    };

    handleTokenExtraction();
  }, [cookies.token, cookies.refresh_token, hasTrackedLoginAttempt]); //eslint-disable-line react-hooks/exhaustive-deps

  // Handle continue button click
  const handleContinueClick = () => {
    // LEGACY - COGNITO: was trackLoginAttempt("Google", "create_account").
    trackLoginAttempt("Sampark Saathi", "create_account");
    setHasTrackedLoginAttempt(true);
  };

  const handleRequestAccess = async () => {
    if (!accessDeniedRequestCode) return;
    setRequestState("submitting");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/sso/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_code: accessDeniedRequestCode }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setRequestState("submitted");
    } catch {
      setRequestState("error");
    }
  };

  if (isProcessing) {
    return (
      <div className="auth-page flex flex-col justify-center items-center w-full h-screen px-4">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (accessDeniedRequestCode !== null) {
    return (
      <div className="auth-page flex flex-col justify-center items-center w-full h-screen px-4">
        <Image
          src="/barabari_logo.png"
          alt="Samvaad Saathi Logo"
          className="w-[116px] h-[110px] mb-6"
          width={300}
          height={300}
        />
        <h2 className="font-noto text-white text-[28px] font-[600] text-center mb-3">
          You don&apos;t have access to Samvaad Saathi yet
        </h2>
        <p className="font-noto text-white/80 text-[15px] text-center mb-8 max-w-md">
          Your Sampark Saathi account is signed in, but Samvaad Saathi isn&apos;t enabled on it yet.
          Request access below — an admin needs to approve it before you can start.
        </p>

        {requestState === "submitted" ? (
          <p className="font-noto text-white text-[15px] text-center bg-white/10 rounded-lg px-6 py-4 max-w-md">
            Request sent. You&apos;ll be able to sign in here once it&apos;s approved.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRequestAccess}
              disabled={requestState === "submitting"}
              className="w-72 h-11 bg-white rounded-lg flex items-center justify-center gap-3 active:scale-95 transition shadow-md cursor-pointer disabled:opacity-60"
            >
              <span className="text-black text-sm font-semibold">
                {requestState === "submitting" ? "Requesting..." : "Request Access"}
              </span>
            </button>
            {requestState === "error" && (
              <p className="font-noto text-red-300 text-sm text-center mt-3">
                Something went wrong. Please try again.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="auth-page flex flex-col justify-center items-center w-full h-screen px-4">
      {/* Logo */}
      <img
        src="/barabari_logo.png"
        alt="Samvaad Saathi Logo"
        className="w-[116px] h-[110px] mb-6"
        width={300}
        height={300}
      />

      {/* Welcome Text */}
      <h2 className="font-noto text-white text-[32px] font-[600] text-center mb-2">
        Welcome to Samvaad Saathi!
      </h2>

      {/* Page Heading */}
      <h1 className="font-noto text-white text-[20px] font-[600] mb-8">Create Account / Login</h1>

      {/* Sampark Saathi SSO login/signup entry point. Must stay a real <Link> (top-level
          navigation, not a fetch/router.push) - the whole /authorize <-> shared-cookie
          redirect chain depends on the browser actually navigating away and back. */}
      {/* LEGACY - COGNITO, kept for rollback:
          href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.AUTH.COGNITO_LOGIN}`} */}
      <Link
        href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.AUTH.SSO_LOGIN}`}
        onClick={handleContinueClick}
      >
        <button className="w-72 h-11 bg-white rounded-lg flex items-center justify-center gap-3 active:scale-95 transition shadow-md cursor-pointer">
          <span className="text-black text-sm font-semibold">Continue</span>
        </button>
      </Link>
    </div>
  );
}
