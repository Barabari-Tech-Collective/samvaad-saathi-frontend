import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResumeStorageRecovery from "@/components/resume/ResumeStorageRecovery";
import {
  rememberResumeReceipt,
  readResumeFingerprint,
  resumeOperationKey,
} from "@/lib/resume-storage-recovery";
import { getAuthRevision } from "@/lib/auth-session";
const f = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/account-request", () => ({ accountJson: f.request }));
const hash = "a".repeat(64);
function login(name: string) {
  document.cookie = `token=x.${btoa(JSON.stringify({ email: name }))}.x; path=/`;
}
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  login("first");
  rememberResumeReceipt({ fileSha256: hash }, getAuthRevision());
});
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  document.cookie = "token=; max-age=0; path=/";
});
it("restores the receipt after remount without automatically uploading or checking", () => {
  const first = render(<ResumeStorageRecovery />);
  first.unmount();
  render(<ResumeStorageRecovery />);
  expect(screen.getByRole("button", { name: "Check file storage" })).toBeVisible();
  expect(f.request).not.toHaveBeenCalled();
});
it("never restores another account's receipt", () => {
  login("second");
  expect(readResumeFingerprint()).toBeNull();
  render(<ResumeStorageRecovery />);
  expect(screen.queryByRole("button")).toBeNull();
});
it("reports registered only for the exact file", async () => {
  f.request.mockResolvedValue({ fileSha256: hash, status: "registered", resumeId: 12 });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText(/This exact file has a saved record/)).toBeVisible();
  expect(f.request.mock.calls[0][0]).toContain(`/me/resume-storage/${hash}`);
});
it("keeps unconfirmed state actionable without claiming failure", async () => {
  f.request.mockResolvedValue({ fileSha256: hash, status: "unconfirmed", resumeId: null });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText(/No saved record was found/)).toBeVisible();
  expect(screen.getByRole("button")).toBeEnabled();
});
it("rejects a mismatched receipt", async () => {
  f.request.mockResolvedValue({ fileSha256: "b".repeat(64), status: "registered", resumeId: 12 });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText(/could not be completed/)).toBeVisible();
});
it("ignores old results when a newer upload is remembered", async () => {
  let finish!: (value: unknown) => void;
  f.request.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button"));
  await act(async () => {
    rememberResumeReceipt({ fileSha256: "b".repeat(64) }, getAuthRevision());
    finish({ fileSha256: hash, status: "registered", resumeId: 12 });
  });
  expect(screen.queryByText(/This exact file has a saved record/)).toBeNull();
  expect(screen.getByRole("button")).toBeEnabled();
});
it("ignores results after an account switch", async () => {
  let finish!: (value: unknown) => void;
  f.request.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button"));
  login("second");
  await act(async () => finish({ fileSha256: hash, status: "registered", resumeId: 12 }));
  expect(screen.queryByText(/This exact file has a saved record/)).toBeNull();
});
it("storage denial never turns an acknowledged save into a failed upload", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("denied");
  });
  expect(() => rememberResumeReceipt({ fileSha256: hash }, getAuthRevision())).not.toThrow();
});

it.each([
  ["completed", true, "confirms your résumé data was saved"],
  ["completed", false, "without confirming saved résumé data"],
  ["started", false, "outcome is not confirmed"],
  ["failed", false, "extraction operation failed"],
])("shows %s extraction independently of file storage", async (state, dataSaved, message) => {
  const key = resumeOperationKey(hash, getAuthRevision());
  f.request
    .mockResolvedValueOnce({ fileSha256: hash, status: "unconfirmed", resumeId: null })
    .mockResolvedValueOnce({ operationKey: key, fileSha256: hash, state, dataSaved });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByText(new RegExp(String(message)))).toBeVisible();
  expect(screen.getByText(/No saved record was found/)).toBeVisible();
});

it("prepares one recovery key without uploading a file", async () => {
  const key = resumeOperationKey(hash, getAuthRevision());
  const child = "12345678-1234-5234-8234-123456789abc";
  f.request
    .mockResolvedValueOnce({ fileSha256: hash, status: "unconfirmed", resumeId: null })
    .mockResolvedValueOnce({
      operationKey: key,
      fileSha256: hash,
      state: "failed",
      dataSaved: false,
    })
    .mockResolvedValueOnce({ operationKey: child, fileSha256: hash });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button", { name: "Check file storage" }));
  fireEvent.click(await screen.findByRole("button", { name: "Prepare another attempt" }));
  expect(await screen.findByText(/Another attempt is ready/)).toBeVisible();
  expect(resumeOperationKey(hash, getAuthRevision())).toBe(child);
  expect(f.request).toHaveBeenCalledTimes(3);
  expect(f.request.mock.calls[2][2]).toEqual({ method: "POST" });
  expect(screen.queryByRole("button", { name: "Prepare another attempt" })).toBeNull();
});
it("does not offer recovery for an unresolved operation", async () => {
  const key = resumeOperationKey(hash, getAuthRevision());
  f.request
    .mockResolvedValueOnce({ fileSha256: hash, status: "unconfirmed", resumeId: null })
    .mockResolvedValueOnce({
      operationKey: key,
      fileSha256: hash,
      state: "started",
      dataSaved: false,
    });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/outcome is not confirmed/);
  expect(screen.queryByRole("button", { name: "Prepare another attempt" })).toBeNull();
});

it("repairs only storage with the selected original and does not start extraction", async () => {
  const key = resumeOperationKey(hash, getAuthRevision());
  f.request
    .mockResolvedValueOnce({ fileSha256: hash, status: "unconfirmed", resumeId: null })
    .mockResolvedValueOnce({
      operationKey: key,
      fileSha256: hash,
      state: "completed",
      dataSaved: true,
    })
    .mockResolvedValueOnce({ fileSha256: hash, status: "registered", resumeId: 12 });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button", { name: "Check file storage" }));
  const input = await screen.findByLabelText("Original résumé file");
  const file = new File(["pdf"], "original.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Restore file only" }));
  expect(await screen.findByText(/AI extraction and profile data were not changed/)).toBeVisible();
  const request = f.request.mock.calls[2];
  expect(request[0]).toContain(`/me/resume-operations/${key}/restore-file`);
  expect(request[2].body.get("file")).toBe(file);
  expect(f.request).toHaveBeenCalledTimes(3);
});
it("leaves storage unconfirmed and offers a check after an ambiguous repair failure", async () => {
  const key = resumeOperationKey(hash, getAuthRevision());
  f.request
    .mockResolvedValueOnce({ fileSha256: hash, status: "unconfirmed", resumeId: null })
    .mockResolvedValueOnce({
      operationKey: key,
      fileSha256: hash,
      state: "completed",
      dataSaved: true,
    })
    .mockRejectedValueOnce(new Error("timeout"));
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button", { name: "Check file storage" }));
  fireEvent.change(await screen.findByLabelText("Original résumé file"), {
    target: { files: [new File(["pdf"], "original.pdf")] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Restore file only" }));
  expect(await screen.findByText(/Storage was not confirmed/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Check file storage" })).toBeEnabled();
});

it.each([
  ["pending", /queued for storage/],
  ["failed", /Automatic file delivery stopped/],
  ["expired", /delivery window has ended/],
])("explains %s delivery without sending a retry", async (deliveryStatus, message) => {
  f.request.mockResolvedValue({
    fileSha256: hash,
    status: "unconfirmed",
    resumeId: null,
    deliveryStatus,
  });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button", { name: "Check file storage" }));
  expect(await screen.findByText(message)).toBeVisible();
  expect(f.request).toHaveBeenCalledTimes(1);
});

it("hides manual restoration while a saved extraction has pending delivery", async () => {
  const key = resumeOperationKey(hash, getAuthRevision());
  f.request
    .mockResolvedValueOnce({ fileSha256: hash, status: "unconfirmed", deliveryStatus: "pending" })
    .mockResolvedValueOnce({
      operationKey: key,
      fileSha256: hash,
      state: "completed",
      dataSaved: true,
    });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button", { name: "Check file storage" }));
  expect(await screen.findByText(/operation confirms/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Restore file only" })).toBeNull();
});

it.each(["failed", "expired"])(
  "allows original-file restoration after %s delivery",
  async (deliveryStatus) => {
    const key = resumeOperationKey(hash, getAuthRevision());
    f.request
      .mockResolvedValueOnce({ fileSha256: hash, status: "unconfirmed", deliveryStatus })
      .mockResolvedValueOnce({
        operationKey: key,
        fileSha256: hash,
        state: "completed",
        dataSaved: true,
      });
    render(<ResumeStorageRecovery />);
    fireEvent.click(screen.getByRole("button", { name: "Check file storage" }));
    expect(await screen.findByRole("button", { name: "Restore file only" })).toBeDisabled();
  }
);

it("rejects unknown delivery states without offering restoration", async () => {
  f.request.mockResolvedValue({
    fileSha256: hash,
    status: "unconfirmed",
    deliveryStatus: "invented",
  });
  render(<ResumeStorageRecovery />);
  fireEvent.click(screen.getByRole("button", { name: "Check file storage" }));
  expect(await screen.findByText(/could not be completed/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Restore file only" })).toBeNull();
});
