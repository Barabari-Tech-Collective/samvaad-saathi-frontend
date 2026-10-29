import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  getResumePdf,
  saveResumePdfToProfile,
} from "@/features/ai-resume/services/resumeDocumentService";
const f = vi.hoisted(() => ({ get: vi.fn(), token: "synthetic-token", fetch: vi.fn() }));
vi.mock("axios", () => ({ default: { get: f.get } }));
vi.mock("@/lib/token-utils", () => ({ getTokenFromCookies: () => f.token }));
beforeEach(() => {
  vi.clearAllMocks();
  f.token = "synthetic-token";
  vi.stubGlobal("fetch", f.fetch);
  f.fetch.mockResolvedValue({ ok: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "token=; max-age=0; path=/";
});
it("saves the canonical backend PDF bytes, without a DOM screenshot or conversion", async () => {
  const pdf = new Blob(["%PDF-1.7 canonical text document"], { type: "application/pdf" });
  f.get.mockResolvedValue({ data: pdf });
  const downloaded = await getResumePdf("7");
  expect(downloaded).toBe(pdf);
  await saveResumePdfToProfile(downloaded);
  expect(f.get.mock.calls[0][0]).toContain("resume-builder/7/download");
  const request = f.fetch.mock.calls[0][1];
  const file = request.body.get("file") as File;
  expect(file.type).toBe("application/pdf");
  expect(file.size).toBe(pdf.size);
  const read = (blob: Blob) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob);
    });
  expect(await read(file)).toBe(await read(pdf));
});
it.each([
  new Blob([], { type: "application/pdf" }),
  new Blob(["failure"], { type: "application/json" }),
  new Blob(["<html>"], { type: "text/html" }),
])("rejects empty or non-PDF responses without uploading", async (data) => {
  f.get.mockResolvedValue({ data });
  await expect(getResumePdf("7")).rejects.toThrow("did not return a PDF");
  expect(f.fetch).not.toHaveBeenCalled();
});
it("does not call services without authentication", async () => {
  f.token = "";
  await expect(getResumePdf("7")).rejects.toThrow("Sign in");
  await expect(saveResumePdfToProfile(new Blob())).rejects.toThrow("Sign in");
  expect(f.get).not.toHaveBeenCalled();
  expect(f.fetch).not.toHaveBeenCalled();
});
it("reports save failure even when the server returns a non-JSON error page", async () => {
  f.fetch.mockResolvedValue({ ok: false });
  await expect(
    saveResumePdfToProfile(new Blob(["PDF"], { type: "application/pdf" }))
  ).rejects.toThrow("Could not save");
});

function switchAccount(name: string) {
  document.cookie = `token=x.${btoa(JSON.stringify({ email: name }))}.x; path=/`;
}
it("rejects a PDF response received after an account switch", async () => {
  switchAccount("first");
  let finish!: (value: unknown) => void;
  f.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = getResumePdf("7");
  switchAccount("second");
  finish({ data: new Blob(["PDF"], { type: "application/pdf" }) });
  await expect(pending).rejects.toThrow("account changed");
  expect(f.fetch).not.toHaveBeenCalled();
});
it("does not upload a previously downloaded PDF under a different account", async () => {
  switchAccount("first");
  f.get.mockResolvedValue({ data: new Blob(["PDF"], { type: "application/pdf" }) });
  const pdf = await getResumePdf("7");
  switchAccount("second");
  await expect(saveResumePdfToProfile(pdf)).rejects.toThrow("account changed");
  expect(f.fetch).not.toHaveBeenCalled();
});
it("does not report an old account's delayed save as current success", async () => {
  switchAccount("first");
  let finish!: (value: unknown) => void;
  f.fetch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = saveResumePdfToProfile(new Blob(["PDF"]));
  switchAccount("second");
  finish({ ok: true });
  await expect(pending).rejects.toThrow("account changed");
});
it("allows token renewal for the same account", async () => {
  switchAccount("first");
  let finish!: (value: unknown) => void;
  f.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = getResumePdf("7");
  document.cookie = `token=x.${btoa(JSON.stringify({ email: "first", exp: 999 }))}.x; path=/`;
  const pdf = new Blob(["PDF"], { type: "application/pdf" });
  finish({ data: pdf });
  expect(await pending).toBe(pdf);
});
