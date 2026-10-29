import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  setCookie: vi.fn(),
  announce: vi.fn(),
  cookies: {} as Record<string, string>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("react-cookie", () => ({ useCookies: () => [mocks.cookies, mocks.setCookie] }));
vi.mock("@/lib/api-config", () => ({ ENDPOINTS: { AUTH: { SSO_LOGIN: "auth/sso/login" } } }));
vi.mock("@/lib/auth-session", () => ({
  announceAuthChange: mocks.announce,
  getAuthRevision: () => 0,
  assertAuthRevision: vi.fn(),
}));
vi.mock("@/components/studio/AuthFrame", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({
  trackLoginAttempt: vi.fn(),
  trackLoginFailure: vi.fn(),
  trackLoginSuccess: vi.fn(),
}));
import SignupPage from "@/app/auth/signup/page";
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  mocks.cookies = {};
  window.history.replaceState({}, "", "/auth/signup");
});
it("processes a fresh callback before old account cookies and replaces history", async () => {
  mocks.cookies = { token: "old", refresh_token: "old-refresh" };
  window.history.replaceState(
    {},
    "",
    "/auth/signup?token=new&refresh_token=new-refresh&return_to=%2Freports%2F3"
  );
  render(<SignupPage />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/reports/3"));
  expect(mocks.setCookie).toHaveBeenCalledWith("token", "new", expect.any(Object));
  expect(mocks.announce).toHaveBeenCalledOnce();
  expect(window.location.search).toBe("?return_to=%2Freports%2F3");
});
it("callback cannot redirect outside the product", async () => {
  window.history.replaceState(
    {},
    "",
    "/auth/signup?token=new&refresh_token=new-refresh&return_to=https://evil.test"
  );
  render(<SignupPage />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/home"));
});
it("does not accept a partial token pair", () => {
  window.history.replaceState({}, "", "/auth/signup?token=new&return_to=%2Freports%2F3");
  render(<SignupPage />);
  expect(mocks.setCookie).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});
it("returning account respects the safe requested destination", async () => {
  mocks.cookies = { token: "old", refresh_token: "old-refresh" };
  window.history.replaceState({}, "", "/auth/signup?return_to=%2Fpractice");
  render(<SignupPage />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/practice"));
  expect(mocks.setCookie).not.toHaveBeenCalled();
});

it("redeems browser-bound handoff before stale cookies and removes URL fragment", async () => {
  mocks.cookies = { token: "old", refresh_token: "old-refresh" };
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test/api");
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ token: "new", refresh_token: "new-refresh", return_to: "/practice" }),
  });
  vi.stubGlobal("fetch", fetcher);
  window.history.replaceState({}, "", "/auth/signup?flow=handoff#handoff=" + "a".repeat(43));
  render(<SignupPage />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/practice"));
  expect(fetcher).toHaveBeenCalledWith(
    "https://api.test/api/auth/sso/complete",
    expect.objectContaining({ credentials: "include", method: "POST" })
  );
  expect(window.location.hash).toBe("");
  expect(window.location.search).toBe("?return_to=%2Fpractice");
  expect(mocks.setCookie).toHaveBeenCalledWith("token", "new", expect.any(Object));
});
it("failed handoff preserves old cookies and shows a restart error", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test/api");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  window.history.replaceState({}, "", "/auth/signup?flow=handoff#handoff=" + "a".repeat(43));
  const view = render(<SignupPage />);
  await waitFor(() => expect(view.getByRole("alert")).toHaveTextContent("Please start again"));
  expect(mocks.setCookie).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});
it("missing handoff cannot silently reuse the prior account", async () => {
  mocks.cookies = { token: "old", refresh_token: "old-refresh" };
  window.history.replaceState({}, "", "/auth/signup?flow=handoff");
  const view = render(<SignupPage />);
  await waitFor(() => expect(view.getByRole("alert")).toBeInTheDocument());
  expect(mocks.replace).not.toHaveBeenCalled();
});
it("v2 denial without a request code remains a clear access state", async () => {
  mocks.cookies = { token: "old", refresh_token: "old-refresh" };
  window.history.replaceState({}, "", "/auth/signup#error=access_denied");
  const view = render(<SignupPage />);
  await waitFor(() =>
    expect(view.getByRole("status")).toHaveTextContent("contact your facilitator")
  );
  expect(mocks.replace).not.toHaveBeenCalled();
});

it("retains the destination after the credential callback remounts the account subtree", async () => {
  window.history.replaceState(
    {},
    "",
    "/auth/signup?token=new&refresh_token=new-refresh&return_to=%2Fhistory"
  );
  const first = render(<SignupPage />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/history"));
  first.unmount();
  mocks.replace.mockClear();
  mocks.cookies = { token: "new", refresh_token: "new-refresh" };
  render(<SignupPage />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/history"));
  expect(window.location.href).not.toContain("refresh_token");
});
