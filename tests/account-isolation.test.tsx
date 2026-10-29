import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import AppProvider from "@/components/providers/app-provider";
import {
  announceAuthChange,
  getAuthRevision,
  assertAuthRevision,
  SessionChangedError,
} from "@/lib/auth-session";
function token(email: string, expires = 1) {
  return `header.${btoa(JSON.stringify({ sub: "access", email, exp: expires }))}.signature`;
}
function login(email: string) {
  document.cookie = `token=${token(email)}; path=/`;
  announceAuthChange();
}
afterEach(() => {
  document.cookie = "token=; max-age=0; path=/";
  announceAuthChange();
  sessionStorage.clear();
});
it("distinguishes real users even though backend JWT sub is constant", () => {
  login("a@test.local");
  const a = getAuthRevision();
  login("b@test.local");
  expect(() => assertAuthRevision(a)).toThrow(SessionChangedError);
});
it("keeps the current session on same-account token refresh", () => {
  login("a@test.local");
  const before = getAuthRevision();
  document.cookie = `token=${token("a@test.local", 2)}; path=/`;
  announceAuthChange();
  expect(getAuthRevision()).toBe(before);
});
it("unmounts old state, stops effects and provides a fresh cache before exposing account B", async () => {
  login("a@test.local");
  const cleaned = vi.fn();
  const clients: unknown[] = [];
  let resolveA!: (value: string) => void;
  const pendingA = new Promise<string>((resolve) => {
    resolveA = resolve;
  });
  function Probe() {
    const client = useQueryClient();
    useEffect(() => {
      clients.push(client);
      return cleaned;
    }, [client]);
    const { data } = useQuery({
      queryKey: ["private-report"],
      queryFn: () => (clients.length === 1 ? pendingA : Promise.resolve("B report")),
    });
    return <p>{data ?? "Loading"}</p>;
  }
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() => expect(clients).toHaveLength(1));
  act(() => login("b@test.local"));
  expect(await screen.findByText("B report")).toBeVisible();
  expect(cleaned).toHaveBeenCalledOnce();
  expect(clients[0]).not.toBe(clients[1]);
  await act(async () => resolveA("A secret report"));
  expect(screen.queryByText("A secret report")).toBeNull();
});
it("clears prior account browser drafts before mounting the next account", async () => {
  login("b@test.local");
  sessionStorage.setItem("samvaad-storage-owner", "email:a@test.local");
  sessionStorage.setItem("pronunciationPracticeData", "A private draft");
  function Probe() {
    return <p>{sessionStorage.getItem("pronunciationPracticeData") ?? "No old draft"}</p>;
  }
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  expect(await screen.findByText("No old draft")).toBeVisible();
});
it("preserves a same-account draft across a page remount", async () => {
  login("a@test.local");
  sessionStorage.setItem("samvaad-storage-owner", "email:a@test.local");
  sessionStorage.setItem("pronunciationPracticeData", "Current draft");
  function Probe() {
    return <p>{sessionStorage.getItem("pronunciationPracticeData")}</p>;
  }
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  expect(await screen.findByText("Current draft")).toBeVisible();
});
it("detects a cookie change from another tab on focus without requiring a storage event", async () => {
  login("a@test.local");
  const cleaned = vi.fn();
  function Probe() {
    useEffect(() => cleaned, []);
    return <p>Account surface</p>;
  }
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await screen.findByText("Account surface");
  act(() => {
    document.cookie = `token=${token("b@test.local")}; path=/`;
    window.dispatchEvent(new Event("focus"));
  });
  await waitFor(() => expect(cleaned).toHaveBeenCalledOnce());
});
it("rejects old authority after logout even before the next UI render", () => {
  login("a@test.local");
  const before = getAuthRevision();
  document.cookie = "token=; max-age=0; path=/";
  expect(() => assertAuthRevision(before)).toThrow(SessionChangedError);
});
it("explicit logout invalidation separates rapid re-login to the same identity", () => {
  login("a@test.local");
  const before = getAuthRevision();
  announceAuthChange(true);
  login("a@test.local");
  expect(() => assertAuthRevision(before)).toThrow(SessionChangedError);
});
