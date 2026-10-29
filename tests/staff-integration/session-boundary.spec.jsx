import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
const state = vi.hoisted(() => ({
  cache: {
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("@/lib/auth/session-client", () => ({ usesBrowserSession: true }));
vi.mock(
  "../../../sampark-saathi frontend/node_modules/@tanstack/react-query/build/modern/index.js",
  () => ({ useQueryClient: () => state.cache })
);
import SessionBoundary from "@/components/auth/SessionBoundary";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let current, root, container;
beforeEach(() => {
  vi.clearAllMocks();
  current = { authenticated: true, uniqueId: "one", role: "FACILITATOR" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(current))
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () =>
    root.render(
      <SessionBoundary>
        <input aria-label="Unsaved work" defaultValue="draft" />
      </SessionBoundary>
    )
  );
}
async function focus() {
  await act(async () => window.dispatchEvent(new Event("focus")));
}
it("keeps drafts mounted during successful focus verification", async () => {
  await mount();
  const input = container.querySelector("input");
  input.value = "keep me";
  await focus();
  expect(container.querySelector("input")).toBe(input);
  expect(input.value).toBe("keep me");
});
it("hides previous account and clears cache on account change", async () => {
  await mount();
  current = { ...current, uniqueId: "two" };
  await focus();
  expect(container.textContent).toContain("Your account changed");
  expect(container.querySelector("input")).toBeNull();
  expect(state.cache.clear).toHaveBeenCalled();
});
it("revoked sessions cannot retain records", async () => {
  await mount();
  current = { authenticated: false };
  await focus();
  expect(container.textContent).toContain("Your session ended");
  expect(container.querySelector("input")).toBeNull();
});
it("role changes require a fresh context", async () => {
  await mount();
  current = { ...current, role: "PROGRAM_MANAGER" };
  await focus();
  expect(container.textContent).toContain("Your account changed");
});
it("verification outage hides data and offers retry", async () => {
  await mount();
  fetch.mockRejectedValueOnce(new Error("offline"));
  await focus();
  expect(container.textContent).toContain("Session verification unavailable");
  expect(container.querySelector("input")).toBeNull();
  const retry = [...container.querySelectorAll("button")].find(
    (x) => x.textContent === "Try again"
  );
  await act(async () => retry.click());
  expect(container.querySelector("input")).not.toBeNull();
});
