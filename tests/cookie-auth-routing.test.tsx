import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ServerSessionClient } from "@/lib/server-session-client";
import { broadcastSessionChange } from "@/lib/session-runtime";
const runtime = vi.hoisted(() => ({
  session: undefined as unknown,
  path: "/home",
  replace: vi.fn(),
}));
vi.mock("@/lib/session-runtime", () => ({
  cookieSessionEnabled: true,
  productSession: () => runtime.session,
  broadcastSessionChange: vi.fn(),
  sessionBroadcastSource: "current-tab",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: runtime.replace }),
  usePathname: () => runtime.path,
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({
  resetUser: vi.fn(),
  identifyUser: vi.fn(),
  trackLogoutButtonClick: vi.fn(),
}));
import AppProvider from "@/components/providers/app-provider";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
let mode: "authenticated" | "anonymous" | "offline" = "authenticated";
let principal = "1";
let onboarded = true;
let completions = 0;
const transport = vi.fn(async (input: RequestInfo | URL) => {
  const path = new URL(String(input)).pathname;
  if (mode === "offline") throw new Error("offline");
  if (path.endsWith("/complete")) {
    completions++;
    mode = "authenticated";
    return Response.json({
      authenticated: true,
      csrf_token: "csrf",
      return_to: "/history?tab=practice",
    });
  }
  if (path.endsWith("/me"))
    return Response.json({
      userId: Number(principal),
      authorizedUser: {
        name: `Learner ${principal}`,
        email: `learner${principal}@example.test`,
        createdAt: "2026-01-01",
        degree: null,
        university: null,
        targetPosition: null,
        yearsExperience: null,
        hasResume: false,
        isOnboarded: onboarded,
        isAdmin: false,
        isSuperAdmin: false,
        canEdit: false,
        canCreateRoles: false,
        totalAttempts: 0,
        membershipRoles: [],
      },
    });
  return mode === "anonymous"
    ? Response.json({ authenticated: false }, { status: 401 })
    : Response.json({ authenticated: true, principal, csrf_token: "csrf" });
});
const session = new ServerSessionClient("https://api.test/api", transport);
runtime.session = session;
function Product() {
  const { user } = useAuth();
  return <p>{user?.authorizedUser.name || "Sign-in page"}</p>;
}
function mount() {
  return render(
    <React.StrictMode>
      <AppProvider>
        <AuthProvider>
          <Product />
        </AuthProvider>
      </AppProvider>
    </React.StrictMode>
  );
}
beforeEach(() => {
  session.invalidate();
  mode = "authenticated";
  principal = "1";
  onboarded = true;
  runtime.path = "/home";
  runtime.replace.mockClear();
  window.history.replaceState({}, "", "/home");
});
it("keeps an authenticated direct visitor on their destination", async () => {
  mount();
  expect(await screen.findByText("Learner 1")).toBeTruthy();
  expect(runtime.replace).not.toHaveBeenCalled();
});
it("preserves the cold visitor deep link without rendering protected content", async () => {
  mode = "anonymous";
  runtime.path = "/history";
  window.history.replaceState({}, "", "/history?tab=practice");
  mount();
  await waitFor(() =>
    expect(runtime.replace).toHaveBeenCalledWith(
      "/auth/signup?return_to=%2Fhistory%3Ftab%3Dpractice"
    )
  );
  expect(screen.queryByText("Sign-in page")).toBeNull();
});
it("does not turn a session outage into a login loop", async () => {
  mode = "offline";
  mount();
  expect(await screen.findByText("We could not verify your session")).toBeTruthy();
  expect(runtime.replace).not.toHaveBeenCalled();
});
it("replaces the account and removes previous profile data on focus verification", async () => {
  mount();
  expect(await screen.findByText("Learner 1")).toBeTruthy();
  principal = "2";
  fireEvent.focus(window);
  expect(await screen.findByText("Learner 2")).toBeTruthy();
  expect(screen.queryByText("Learner 1")).toBeNull();
});
it("ignores its own channel messages but invalidates when another tab changes the session", async () => {
  const channels: { onmessage: ((event: { data: unknown }) => void) | null }[] = [];
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      constructor() {
        channels.push(this);
      }
      close() {
        this.onmessage = null;
      }
    }
  );
  const view = mount();
  try {
    expect(await screen.findByText("Learner 1")).toBeTruthy();
    const before = session.snapshot();
    for (const channel of channels)
      channel.onmessage?.({ data: { type: "changed", source: "current-tab" } });
    expect(session.snapshot()).toEqual(before);
    for (const channel of channels)
      channel.onmessage?.({ data: { type: "changed", source: "another-tab" } });
    expect(session.snapshot().authenticated).toBe(false);
    expect(session.snapshot().revision).toBeGreaterThan(before.revision);
  } finally {
    view.unmount();
    vi.unstubAllGlobals();
  }
});
it("retains the callback destination through required onboarding", async () => {
  onboarded = false;
  runtime.path = "/auth/signup";
  window.history.replaceState({}, "", "/auth/signup?return_to=%2Fhistory");
  mount();
  await waitFor(() =>
    expect(runtime.replace).toHaveBeenCalledWith("/onboarding?return_to=%2Fhistory")
  );
});
it("does not silently reuse an old account when central authorization is denied", async () => {
  runtime.path = "/auth/signup";
  window.history.replaceState({}, "", "/auth/signup# error=access_denied".replace("# ", "#"));
  mount();
  expect(await screen.findByText("We could not verify your session")).toBeTruthy();
  expect(screen.queryByText("Learner 1")).toBeNull();
  expect(runtime.replace).not.toHaveBeenCalled();
  expect(window.location.hash).toBe("");
});
it("rejects legacy browser credentials when secure session mode is selected", async () => {
  runtime.path = "/auth/signup";
  window.history.replaceState({}, "", "/auth/signup?token=unexpected&refresh_token=unexpected");
  mount();
  expect(await screen.findByText("We could not verify your session")).toBeTruthy();
  expect(runtime.replace).not.toHaveBeenCalled();
  expect(window.location.search).toBe("?flow=rejected");
});
it("completes a single-use callback once across StrictMode and account-boundary remounts", async () => {
  vi.mocked(broadcastSessionChange).mockClear();
  mode = "anonymous";
  runtime.path = "/auth/signup";
  window.history.replaceState({}, "", `/auth/signup?flow=handoff#handoff=${"t".repeat(43)}`);
  mount();
  await waitFor(() => expect(runtime.replace).toHaveBeenCalledWith("/history?tab=practice"));
  expect(completions).toBe(1);
  expect(window.location.hash).toBe("");
  expect(document.cookie).not.toContain("token=");
  expect(broadcastSessionChange).toHaveBeenCalledTimes(1);
});
