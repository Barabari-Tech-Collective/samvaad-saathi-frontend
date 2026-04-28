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
      if (!searchParams) return;

      // Extract token and refresh_token from URL query parameters
      const params = new URLSearchParams(searchParams);
      const token = params.get("token");
      const refreshToken = params.get("refresh_token");

      if (token && refreshToken) {
        setIsProcessing(true);

        // Track successful login
        trackLoginSuccess("Google");

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
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );

        // Redirect to root page to let the main routing logic handle the redirect
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else if (hasTrackedLoginAttempt) {
        // If we tracked a login attempt but no tokens were received, track failure
        const params = new URLSearchParams(window.location.search);
        const error = params.get("error");
        trackLoginFailure(error || "google_login_error");
      }
    };

    handleTokenExtraction();
  }, [cookies.token, cookies.refresh_token, hasTrackedLoginAttempt]); //eslint-disable-line react-hooks/exhaustive-deps

  // Handle continue button click
  const handleContinueClick = () => {
    trackLoginAttempt("Google", "create_account");
    setHasTrackedLoginAttempt(true);
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

  return (
    <div className="auth-page flex flex-col justify-center items-center w-full h-screen px-4">
      {/* Logo */}
      <Image
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
      <h1 className="font-noto text-white text-[20px] font-[600] mb-8">
        Create Account / Login
      </h1>

      {/* Google Signup */}
      <Link
        href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.AUTH.COGNITO_LOGIN}`}
        onClick={handleContinueClick}
      >
        <button className="w-72 h-11 bg-white rounded-lg flex items-center justify-center gap-3 active:scale-95 transition shadow-md cursor-pointer">
          <span className="text-black text-sm font-semibold">Continue</span>
        </button>
      </Link>
    </div>
  );
}
