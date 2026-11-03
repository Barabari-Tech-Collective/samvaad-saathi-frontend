import { productSession } from "@/lib/session-runtime";
/** Client isolation only. JWT claims are NOT authorization; the server verifies tokens. */
let previous: string | undefined;
let revision = 0;
let opaqueToken: string | null = null;
let opaqueId = 0;
const EVENT = "samvaad-auth-change";
const CHANNEL = "samvaad-auth-session";
export class SessionChangedError extends Error {
  constructor() {
    super("Your account changed. Reopen this task in the current account.");
    this.name = "SessionChangedError";
  }
}
export function readAccessCookie(): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split(";").find((part) => part.trim().startsWith("token="));
  return value ? value.trim().slice("token=".length) || null : null;
}
function principal(token: string | null): string {
  if (!token) return "anonymous";
  try {
    const part = token.split(".")[1];
    const data = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    // A refresh rotates the JWT (and its jti). It must not look like an account
    // change and remount the workspace, because that destroys in-progress fields.
    // Central Auth supplies a stable userUniqueId; older Samvaad tokens carry
    // email/username instead. `sub: access` is not an identity.
    if (typeof data.userUniqueId === "string" && data.userUniqueId.trim())
      return `user:${data.userUniqueId}`;
    if (typeof data.email === "string" && data.email.trim()) return `email:${data.email}`;
    if (typeof data.username === "string" && data.username.trim())
      return `username:${data.username}`;
    if (typeof data.sub === "string" && data.sub.trim() && data.sub !== "access")
      return `subject:${data.sub}`;
  } catch {
    /* Unknown token formats must not share cache with another token. */
  }
  if (opaqueToken !== token) {
    opaqueToken = token;
    opaqueId += 1;
  }
  return `opaque:${opaqueId}`;
}
export function getAuthRevision(): number {
  const session = productSession();
  if (session) return session.revision();
  const current = principal(readAccessCookie());
  if (previous === undefined) previous = current;
  else if (previous !== current) {
    previous = current;
    revision += 1;
  }
  return revision;
}
export function assertAuthRevision(expected: number) {
  if (getAuthRevision() !== expected) throw new SessionChangedError();
}
export function announceAuthChange(invalidate = false) {
  if (typeof window === "undefined") return;
  if (invalidate) revision += 1;
  window.dispatchEvent(new Event(EVENT));
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(invalidate ? "logout" : "changed");
    channel.close();
  } catch {
    /* Poll/focus fallback remains active. */
  }
}
export function subscribeAuthRevision(notify: () => void) {
  const session = productSession();
  if (session) return session.subscribe(notify);
  let observed = getAuthRevision();
  const check = () => {
    const current = getAuthRevision();
    // Polling is only a legacy fallback for a cookie mutation that happened
    // outside this app. Do not wake every protected page twice a second when
    // nothing changed; logout/login broadcasts and focus remain immediate.
    if (current === observed) return;
    observed = current;
    notify();
  };
  const timer = window.setInterval(check, 2_000);
  window.addEventListener(EVENT, check);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  document.addEventListener("visibilitychange", check);
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      if (event.data === "logout") revision += 1;
      check();
    };
  } catch {
    /* Fallback above. */
  }
  return () => {
    clearInterval(timer);
    channel?.close();
    window.removeEventListener(EVENT, check);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    document.removeEventListener("visibilitychange", check);
  };
}

export function getAuthStorageOwner(): string {
  const session = productSession();
  return session
    ? `central:${session.snapshot().principal ?? "anonymous"}`
    : principal(readAccessCookie());
}
