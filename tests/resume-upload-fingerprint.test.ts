import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prepareResumeUpload, readResumeFingerprint } from "@/lib/resume-storage-recovery";
import { getAuthRevision } from "@/lib/auth-session";
function login(name: string) {
  document.cookie = `token=x.${btoa(JSON.stringify({ email: name }))}.x; path=/`;
}
beforeEach(() => {
  sessionStorage.clear();
  login("first");
  // jsdom FileReader buffers belong to another realm; normalize only at
  // the Node WebCrypto boundary while still hashing the actual file bytes.
  vi.stubGlobal("crypto", {
    subtle: {
      digest: (algorithm: string, bytes: ArrayBuffer) =>
        webcrypto.subtle.digest(algorithm, Buffer.from(new Uint8Array(bytes))),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  document.cookie = "token=; max-age=0; path=/";
});
it("remembers the SHA-256 of the original bytes before any upload response exists", async () => {
  const hash = await prepareResumeUpload(new File(["abc"], "resume.pdf"), getAuthRevision());
  expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  expect(readResumeFingerprint()).toBe(hash);
});
it("blocks stale preparation before reading the file", async () => {
  const owner = getAuthRevision();
  login("second");
  await expect(prepareResumeUpload(new File(["abc"], "resume.pdf"), owner)).rejects.toThrow(
    "account changed"
  );
  expect(readResumeFingerprint()).toBeNull();
});
it("does not retain a digest when the account changes during hashing", async () => {
  let finish!: (value: ArrayBuffer) => void;
  const digest = vi.fn(
    () =>
      new Promise<ArrayBuffer>((resolve) => {
        finish = resolve;
      })
  );
  vi.stubGlobal("crypto", { subtle: { digest } });
  const pending = prepareResumeUpload(new File(["abc"], "resume.pdf"), getAuthRevision());
  await vi.waitFor(() => expect(digest).toHaveBeenCalled());
  login("second");
  finish(new ArrayBuffer(32));
  await expect(pending).rejects.toThrow("account changed");
  expect(readResumeFingerprint()).toBeNull();
});
it("does not invent a fingerprint when secure hashing is unavailable", async () => {
  vi.stubGlobal("crypto", {});
  await expect(
    prepareResumeUpload(new File(["abc"], "resume.pdf"), getAuthRevision())
  ).rejects.toThrow("Secure file preparation");
  expect(readResumeFingerprint()).toBeNull();
});
