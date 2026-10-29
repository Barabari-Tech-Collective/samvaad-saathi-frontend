"use client";

import { cookieSessionEnabled } from "@/lib/session-runtime";
import { useAuth } from "@/components/providers/auth-provider";
import { loginDestination } from "@/lib/login-destination";
import { announceAuthChange, getAuthRevision, assertAuthRevision } from "@/lib/auth-session";
import { ENDPOINTS } from "@/lib/api-config";

import {
  trackLoginAttempt,
  trackLoginFailure,
  trackLoginSuccess,
} from "@/lib/posthog/tracking.utils";
import AuthFrame from "@/components/studio/AuthFrame";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCookies } from "react-cookie";

function LegacySignupPage() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:8000/api" : "");
  const [destination, setDestination] = useState("/home");
  const handledCallback = useRef(false);
  const ssoLoginUrl = apiBaseUrl
    ? `${apiBaseUrl}/${ENDPOINTS.AUTH.SSO_LOGIN}?return_to=${encodeURIComponent(destination)}`
    : undefined;
  const [cookies, setCookie] = useCookies(["token", "refresh_token"]);
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasTrackedLoginAttempt, setHasTrackedLoginAttempt] = useState(false);
  // Central-auth plan, Phase 10: set when auth-service's /authorize denies this student
  // access to Samvaad Saathi specifically (they're authenticated, just not entitled yet).
  // requestCode is the one-time proof-of-identity the denied login left behind — this
  // student has no bearer token at all, since /authorize stopped before ever issuing one.
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedRequestCode, setAccessDeniedRequestCode] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "submitting" | "submitted" | "error">(
    "idle"
  );

  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const handleTokenExtraction = async () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const returnTo = loginDestination(params.get("return_to"));
      setDestination(returnTo);
      const handoff = new URLSearchParams(window.location.hash.slice(1)).get("handoff");
      if (handledCallback.current) return;
      if (params.get("flow") === "handoff") {
        handledCallback.current = true;
        const revision = getAuthRevision();
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsProcessing(true);
        try {
          if (!handoff || !/^[A-Za-z0-9_-]{43}$/.test(handoff) || !apiBaseUrl)
            throw new Error("Invalid handoff");
          const response = await fetch(`${apiBaseUrl}/auth/sso/complete`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticket: handoff }),
          });
          if (!response.ok) throw new Error("Handoff failed");
          const data = await response.json();
          assertAuthRevision(revision);
          if (
            !data ||
            typeof data.token !== "string" ||
            !data.token ||
            typeof data.refresh_token !== "string" ||
            !data.refresh_token
          )
            throw new Error("Invalid response");
          const options = {
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict" as const,
            maxAge: 60 * 60 * 24 * 7,
          };
          const completedDestination = loginDestination(data.return_to);
          window.history.replaceState(
            {},
            document.title,
            `/auth/signup?return_to=${encodeURIComponent(completedDestination)}`
          );
          setCookie("token", data.token, options);
          setCookie("refresh_token", data.refresh_token, options);
          announceAuthChange(true);
          router.replace(completedDestination);
        } catch {
          setIsProcessing(false);
          setLoginError("Sign-in could not be completed. Please start again.");
        }
        return;
      }
      const callbackError = new URLSearchParams(window.location.hash.slice(1)).get("error");
      if (callbackError === "access_denied") {
        setAccessDenied(true);
        setAccessDeniedRequestCode(
          new URLSearchParams(window.location.hash.slice(1)).get("requestCode")
        );
        return;
      }
      if (callbackError) {
        setLoginError("Sign-in could not be completed. Please start again.");
        return;
      }
      // A new callback must be processed before considering stale account cookies.
      if (
        !params.get("token") &&
        !params.get("refresh_token") &&
        cookies.token &&
        cookies.refresh_token
      ) {
        router.replace(returnTo);
        return;
      }
      if (handledCallback.current) return;

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
      const token = params.get("token");
      const refreshToken = params.get("refresh_token");

      if (token && refreshToken) {
        handledCallback.current = true;
        setIsProcessing(true);

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
          `/auth/signup?return_to=${encodeURIComponent(returnTo)}`
        );

        announceAuthChange(true);
        trackLoginSuccess("Sampark Saathi");
        router.replace(returnTo);
      } else if (hasTrackedLoginAttempt) {
        // If we tracked a login attempt but no tokens were received, track failure
        // LEGACY - COGNITO: was trackLoginFailure(error || "google_login_error"), reading
        // from window.location.search - errors were never actually in the query string
        // (see hashParams above), so this always silently fell through to the fallback.
        trackLoginFailure(errorParam || "sso_login_error");
      }
    };

    void handleTokenExtraction();
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
      <AuthFrame title="Opening your studio…">
        <p role="status" className="studio-muted">
          Signing you in. This will only take a moment.
        </p>
      </AuthFrame>
    );
  }
  if (accessDenied) {
    return (
      <AuthFrame
        title="Let’s get you access."
        description="You’re signed in with your Barabari Collective account. An admin needs to turn on Samvaad Saathi for you before you can begin."
      >
        {!accessDeniedRequestCode ? (
          <p role="status" className="studio-panel">
            Please contact your facilitator or administrator to request Samvaad access.
          </p>
        ) : requestState === "submitted" ? (
          <p role="status" className="studio-panel">
            Request sent. You can sign in here once it’s approved.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRequestAccess}
              disabled={requestState === "submitting"}
              className="studio-auth-action"
            >
              {requestState === "submitting" ? "Requesting…" : "Request access"}
            </button>
            {requestState === "error" && (
              <p role="alert" className="mt-4 text-red-700">
                Your request could not be sent. Please try again.
              </p>
            )}
          </>
        )}
      </AuthFrame>
    );
  }
  return (
    <AuthFrame
      title="Your next interview starts here."
      description="Sign in with your Barabari Collective account to practise, get feedback and prepare for your next opportunity."
    >
      {loginError && (
        <p role="alert" className="mb-4 text-red-700">
          {loginError}
        </p>
      )}
      {/* Keep SSO a real top-level navigation: shared-cookie redirects require it. */}
      {ssoLoginUrl ? (
        <Link className="studio-auth-action" href={ssoLoginUrl} onClick={handleContinueClick}>
          Sign in with Barabari Collective <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <>
          <button disabled className="studio-auth-action">
            Sign-in unavailable
          </button>
          <p role="alert" className="mt-4 studio-muted">
            Please try again later or contact your facilitator.
          </p>
        </>
      )}
      <p className="mt-5 text-sm studio-muted">
        Sign in once and use every Barabari Collective tool.
      </p>
    </AuthFrame>
  );
}

function CookieSignupPage() {
  const { signInWithSso } = useAuth();
  return (
    <AuthFrame
      title="Welcome to Samvaad Saathi"
      description="Sign in to continue your interview preparation."
    >
      <button className="studio-auth-action" onClick={signInWithSso}>
        Continue to sign in <span aria-hidden="true">→</span>
      </button>
    </AuthFrame>
  );
}
export default function SignupPage() {
  return cookieSessionEnabled ? <CookieSignupPage /> : <LegacySignupPage />;
}
