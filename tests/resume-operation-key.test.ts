import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { getAuthRevision } from "@/lib/auth-session";
import {
  resumeOperationKey,
  readResumeOperation,
  acceptResumeRecovery,
} from "@/lib/resume-storage-recovery";
function login(name: string) {
  document.cookie = `token=x.${btoa(JSON.stringify({ email: name }))}.x; path=/`;
}
beforeEach(() => {
  sessionStorage.clear();
  login("first");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  document.cookie = "token=; max-age=0; path=/";
});
it("reuses a persisted UUID for the same account and original bytes", () => {
  const key = resumeOperationKey("a".repeat(64), getAuthRevision());
  expect(resumeOperationKey("a".repeat(64), getAuthRevision())).toBe(key);
  expect(readResumeOperation("a".repeat(64))).toBe(key);
});
it("does not reuse another file's operation", () => {
  const first = resumeOperationKey("a".repeat(64), getAuthRevision());
  expect(resumeOperationKey("b".repeat(64), getAuthRevision())).not.toBe(first);
});
it("does not reuse another account's operation", () => {
  const first = resumeOperationKey("a".repeat(64), getAuthRevision());
  login("second");
  expect(readResumeOperation("a".repeat(64))).toBeNull();
  expect(resumeOperationKey("a".repeat(64), getAuthRevision())).not.toBe(first);
});
it("blocks dispatch preparation if the operation key cannot be persisted", () => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("denied");
    },
  });
  expect(() => resumeOperationKey("a".repeat(64), getAuthRevision())).toThrow(
    "Allow browser storage"
  );
});

it("does not overwrite a newer operation with a delayed recovery", () => {
  const key = resumeOperationKey("a".repeat(64), getAuthRevision());
  const newer = resumeOperationKey("b".repeat(64), getAuthRevision());
  expect(() =>
    acceptResumeRecovery(
      "a".repeat(64),
      key,
      { fileSha256: "a".repeat(64), operationKey: "12345678-1234-5234-8234-123456789abc" },
      getAuthRevision()
    )
  ).toThrow("upload changed");
  expect(readResumeOperation("b".repeat(64))).toBe(newer);
});
