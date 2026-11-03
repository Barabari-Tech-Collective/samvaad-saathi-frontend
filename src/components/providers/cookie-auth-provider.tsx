"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/components/providers/auth-provider";
import {
  productSession,
  broadcastSessionChange,
  sessionBroadcastSource,
} from "@/lib/session-runtime";
import { SessionBootstrap } from "@/lib/session-bootstrap";
import { loginDestination } from "@/lib/login-destination";
import { clearLogoutStorage } from "@/lib/logout-storage";
import { resetUser } from "@/lib/posthog/tracking.utils";
import { ENDPOINTS } from "@/lib/api-config";
import type { UserProfile } from "@/lib/types/user";

let bootstrap: SessionBootstrap | undefined;
let completion: Promise<string> | undefined;
let callbackDestination: string | undefined;
function lifecycle() {
  const session = productSession();
  if (!session) throw new Error("Sign-in is not configured.");
  bootstrap ??= new SessionBootstrap(session);
  return { session, bootstrap };
}

function login() {
  const base = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "");
  if (base.protocol !== "https:") throw new Error("Secure sign-in is not configured.");
  const url = new URL(`${base.href.replace(/\/$/, "")}/${ENDPOINTS.AUTH.SSO_LOGIN}`);
  const current = new URL(window.location.href);
  url.searchParams.set(
    "return_to",
    loginDestination(
      current.pathname === "/auth/signup"
        ? current.searchParams.get("return_to")
        : current.pathname + current.search
    )
  );
  window.location.assign(url.href);
}

export function CookieAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const cache = useQueryClient();
  const [logoutError, setLogoutError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // A cookie session is deliberately checked when this provider mounts and after an
  // explicit cross-tab account change.  Do not throw away a verified in-memory user
  // because a *background* check is interrupted by a flaky network, a sleeping
  // laptop, or a short Central Auth outage.  A confirmed anonymous response still
  // clears this value and follows the normal sign-in path below.
  const [lastConfirmedUser, setLastConfirmedUser] = useState<UserProfile | null>(null);
  const logoutFlight = useRef(false);
  const publicPage = pathname === "/auth/signup" || pathname === "/auth/session-workspace";
  const query = useQuery({
    queryKey: [ENDPOINTS.AUTH.ABOUT_ME],
    retry: false,
    enabled: pathname !== "/auth/session-workspace",
    queryFn: async () => {
      const { bootstrap } = lifecycle();
      const url = new URL(window.location.href);
      if (
        url.pathname === "/auth/signup" &&
        (url.searchParams.get("flow") === "rejected" ||
          new URLSearchParams(url.hash.slice(1)).has("error"))
      ) {
        window.history.replaceState({}, "", "/auth/signup?flow=rejected");
        throw new Error(
          "Sign-in was not completed. Please contact your facilitator if access was denied."
        );
      }
      if (
        ["token", "refresh_token", "accessToken", "refreshToken"].some((key) =>
          url.searchParams.has(key)
        )
      ) {
        window.history.replaceState({}, "", "/auth/signup?flow=rejected");
        throw new Error("Restart sign-in using the secure session flow.");
      }
      if (url.pathname === "/auth/signup" && url.searchParams.get("flow") === "handoff") {
        const ticket = new URLSearchParams(url.hash.slice(1)).get("handoff") || "";
        // Remove proof before awaiting any network operation; retain the single flight
        // outside React so identity-boundary remounts cannot consume it twice.
        window.history.replaceState({}, "", "/auth/signup");
        completion = bootstrap.complete(ticket).then((destination) => {
          callbackDestination = destination;
          // Completion can be awaited by multiple account-boundary mounts.
          // Publish the change once per exchange, not once per waiting mount:
          // a duplicate broadcast can invalidate the new profile request.
          broadcastSessionChange();
          return destination;
        });
      }
      if (completion) {
        const pending = completion;
        try {
          await pending;
        } finally {
          if (completion === pending) completion = undefined;
        }
      }
      return bootstrap.load();
    },
  });
  useEffect(() => {
    if (query.data) {
      setLastConfirmedUser(query.data);
    } else if (!query.isPending && !query.isError) {
      // This was a successful, confirmed anonymous response—not a transient outage.
      setLastConfirmedUser(null);
    }
  }, [query.data, query.isError, query.isPending]);
  // A successful anonymous response is authoritative immediately. This avoids even a
  // single render of protected content after an explicit logout or an expired session.
  const confirmedAnonymous = !query.isPending && !query.isError && !query.data;
  const user = confirmedAnonymous
    ? null
    : (query.data ?? (query.isError ? lastConfirmedUser : null));
  useEffect(() => {
    if (
      query.isPending ||
      (query.isError && !lastConfirmedUser) ||
      leaving ||
      pathname === "/auth/session-workspace"
    )
      return;
    if (!user && !publicPage) {
      router.replace(
        `/auth/signup?return_to=${encodeURIComponent(loginDestination(window.location.pathname + window.location.search))}`
      );
    } else if (
      user &&
      !user.authorizedUser.isOnboarded &&
      pathname !== "/onboarding" &&
      !(user.authorizedUser.canUseBulkAts && pathname.startsWith("/bulk-ats"))
    ) {
      const target =
        callbackDestination ||
        loginDestination(
          pathname === "/auth/signup"
            ? new URLSearchParams(window.location.search).get("return_to")
            : window.location.pathname + window.location.search
        );
      callbackDestination = undefined;
      router.replace(`/onboarding?return_to=${encodeURIComponent(target)}`);
    } else if (user && pathname === "/auth/signup") {
      const target =
        callbackDestination ||
        loginDestination(new URLSearchParams(window.location.search).get("return_to"));
      callbackDestination = undefined;
      router.replace(target);
    }
  }, [
    query.isPending,
    query.isError,
    user,
    pathname,
    publicPage,
    router,
    leaving,
    lastConfirmedUser,
  ]);

  const refetch = query.refetch;
  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("samvaad-cookie-session");
      channel.onmessage = (event) => {
        if (event.data?.source === sessionBroadcastSource) return;
        lifecycle().session.invalidate();
        void refetch();
      };
    } catch {
      /* A browser without BroadcastChannel continues with its current verified session. */
    }
    return () => {
      channel?.close();
    };
  }, [refetch]);

  const performSignOut = (globally: boolean) => {
    if (logoutFlight.current) return;
    logoutFlight.current = true;
    setLeaving(true);
    setLogoutError(false);
    void lifecycle()
      .session.logout(globally)
      .then(() => {
        clearLogoutStorage();
        resetUser();
        cache.clear();
        broadcastSessionChange();
        callbackDestination = undefined;
        router.replace("/auth/signup");
      })
      .catch(() => {
        logoutFlight.current = false;
        setLogoutError(true);
        setLeaving(false);
      });
  };
  // A normal student logout must always be able to end this browser's Samvaad
  // session.  Requiring Central Auth's cross-device revocation here meant a
  // temporary central outage stranded the student on a protected screen.  The
  // global endpoint remains available for an explicit "sign out everywhere"
  // control; the ordinary navigation/profile action is intentionally local.
  const signOut = () => performSignOut(false);
  if ((query.isError && !lastConfirmedUser) || logoutError)
    return (
      <main className="studio-page">
        <h1>
          {logoutError ? "Sign-out could not be confirmed" : "We could not verify your session"}
        </h1>
        <p role="alert">Please try again. Your account data is hidden until this is resolved.</p>
        <button
          className="ws-button"
          onClick={() => (logoutError ? signOut() : void query.refetch())}
        >
          Try again
        </button>
        <button className="ws-button" onClick={login}>
          Restart sign-in
        </button>
        {logoutError && (
          <button className="ws-button" onClick={() => performSignOut(false)}>
            Sign out of this Samvaad session only
          </button>
        )}
      </main>
    );
  if (pathname === "/auth/session-workspace")
    return (
      <AuthContext.Provider value={{ user: null, loading: false, signInWithSso: login, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  if (query.isPending || leaving || (!publicPage && !user))
    return <p role="status">{leaving ? "Signing out…" : "Checking your session…"}</p>;
  return (
    <AuthContext.Provider value={{ user, loading: query.isPending, signInWithSso: login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
