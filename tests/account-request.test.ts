import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { accountJson } from "@/lib/account-request";
import { getAuthRevision } from "@/lib/auth-session";
import { aiResumeService } from "@/features/ai-resume/services/aiResumeService";
const f = vi.hoisted(() => ({ post: vi.fn(), fetch: vi.fn() }));
vi.mock("axios", () => ({ default: { post: f.post, isAxiosError: () => false } }));
function login(name: string) {
  document.cookie = `token=x.${btoa(JSON.stringify({ email: name }))}.x; path=/`;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  login("first");
  vi.stubGlobal("fetch", f.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "token=; max-age=0; path=/";
});
it("blocks stale dispatch before sending any request", async () => {
  const owner = getAuthRevision();
  login("second");
  await expect(accountJson("/test", owner)).rejects.toThrow("account changed");
  expect(f.fetch).not.toHaveBeenCalled();
});
it("guards delayed response bodies as well as response headers", async () => {
  const body = deferred<unknown>();
  const json = vi.fn(() => body.promise);
  f.fetch.mockResolvedValue({ ok: true, json });
  const pending = accountJson("/test", getAuthRevision());
  await vi.waitFor(() => expect(json).toHaveBeenCalled());
  login("second");
  body.resolve({ private: "first" });
  await expect(pending).rejects.toThrow("account changed");
});
it("replaces old-account network failures with a session change", async () => {
  const request = deferred<unknown>();
  f.fetch.mockReturnValue(request.promise);
  const pending = accountJson("/test", getAuthRevision());
  login("second");
  request.reject(new Error("offline"));
  await expect(pending).rejects.toThrow("account changed");
});
it("does not read an error body or expose its contents", async () => {
  const json = vi.fn();
  f.fetch.mockResolvedValue({ ok: false, json });
  await expect(accountJson("/test", getAuthRevision())).rejects.toThrow("could not be completed");
  expect(json).not.toHaveBeenCalled();
});
it("authenticates a successful request and preserves its upload body", async () => {
  f.fetch.mockResolvedValue({ ok: true, json: async () => ({ saved: true }) });
  const body = new FormData();
  expect(await accountJson("/test", getAuthRevision(), { method: "POST", body })).toEqual({
    saved: true,
  });
  const init = f.fetch.mock.calls[0][1];
  expect(init.body).toBe(body);
  expect(init.headers.get("Authorization")).toMatch(/^Bearer /);
});
it("rejects stale AI analysis success", async () => {
  const request = deferred<unknown>();
  f.post.mockReturnValue(request.promise);
  const pending = aiResumeService.analyzeResume(
    new File(["pdf"], "cv.pdf"),
    "role",
    "entry",
    "description"
  );
  login("second");
  request.resolve({ data: { private: "first" } });
  await expect(pending).rejects.toThrow("account changed");
});
it("rejects stale AI analysis failure", async () => {
  const request = deferred<unknown>();
  f.post.mockReturnValue(request.promise);
  const pending = aiResumeService.analyzeResume(
    new File(["pdf"], "cv.pdf"),
    "role",
    "entry",
    "description"
  );
  login("second");
  request.reject(new Error("provider failure"));
  await expect(pending).rejects.toThrow("account changed");
});
