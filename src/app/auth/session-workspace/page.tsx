"use client";

import { useEffect, useRef, useState } from "react";
import AuthFrame from "@/components/studio/AuthFrame";
import { ServerSessionClient, SessionClientError, type SessionProfile } from "@/lib/server-session-client";

/** Isolated acceptance surface until every protected product transport is migrated. */
export default function SessionWorkspace() {
  const client = useRef<ServerSessionClient | null>(null);
  const boot = useRef<Promise<void> | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  const revision = useRef(0);

  const load = async () => {
    const expected = ++revision.current;
    setBusy(true); setProfile(null); setError(null);
    try {
      const state = await client.current!.status();
      if (state.authenticated) {
        const value = await client.current!.profile();
        if (revision.current === expected) setProfile(value);
      }
    } catch (cause) {
      if (revision.current === expected) setError(cause instanceof SessionClientError && cause.status === 409 ? "Your session changed. Check your session again." : "We could not load your session. Please try again.");
    } finally { if (revision.current === expected) setBusy(false); }
  };

  useEffect(() => {
    let active = true;
    if (!boot.current) {
      boot.current = (async () => {
        try {
          const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
          client.current = new ServerSessionClient(base);
          setLogin(`${base.replace(/\/$/, "")}/auth/sso/login?return_to=%2Fhome`);
          const params = new URLSearchParams(window.location.search);
          const fragment = new URLSearchParams(window.location.hash.slice(1));
          const ticket = fragment.get("handoff");
          const callbackError = fragment.get("error");
          // Remove callback material before starting any request.
          if (window.location.hash || window.location.search) window.history.replaceState({}, "", window.location.pathname);
          if (callbackError) throw new Error("Sign-in failed");
          if (params.get("flow") === "handoff") await client.current.complete(ticket || "");
        } catch {
          setError("Sign-in could not be completed. Start again or check the session configuration.");
          setBusy(false);
          throw new Error("Initialization failed");
        }
      })();
    }
    void boot.current.then(() => { if (active) void load(); }).catch(() => {});
    const changed = () => {
      revision.current += 1;
      client.current?.invalidate(); setProfile(null); setBusy(false);
      setError("Your session may have changed in another tab. Check your session to continue.");
    };
    let channel: BroadcastChannel | undefined;
    try { channel = new BroadcastChannel("samvaad-cookie-session"); channel.onmessage = changed; } catch { /* Focus recheck below. */ }
    window.addEventListener("focus", changed);
    return () => { active = false; revision.current += 1; channel?.close(); window.removeEventListener("focus", changed); };
  }, []);

  const recover = async () => {
    setBusy(true); setError(null); setProfile(null);
    try { await client.current!.refresh(); await load(); }
    catch { setError("Session recovery could not be confirmed. Check your session or sign in again."); setBusy(false); }
  };

  const logout = async () => {
    ++revision.current; setBusy(true); setError(null);
    try {
      await client.current!.logout(); setProfile(null);
      try { const channel = new BroadcastChannel("samvaad-cookie-session"); channel.postMessage("changed"); channel.close(); } catch { /* Other tabs recheck on focus. */ }
    } catch { setError("Sign-out could not be confirmed. Please try again."); }
    finally { setBusy(false); }
  };

  return <AuthFrame title="Your session" description="Preview the new sign-in experience. Practice and interviews remain in the current workspace.">
    {busy && <p role="status">Checking your session…</p>}
    {error && <p role="alert">{error}</p>}
    {profile && <section aria-label="Signed-in profile"><h2>{profile.authorizedUser.name}</h2><p>{profile.authorizedUser.email}</p><p>Completed interviews: {profile.authorizedUser.totalAttempts}</p></section>}
    <div className="flex flex-wrap gap-3 mt-4">
      <button className="ws-button" disabled={busy || !client.current} onClick={() => void load()}>Check session</button>
      <button className="ws-button" disabled={busy || !client.current} onClick={() => void recover()}>Recover session</button>
      <button className="ws-button" disabled={busy || !client.current} onClick={() => void logout()}>Sign out</button>
      {!busy && login && <a className="ws-button" href={login}>Sign in</a>}
      <a className="ws-button" href="/auth/signup">Current workspace</a>
    </div>
  </AuthFrame>;
}
