import { assertAuthRevision, getAuthStorageOwner } from "@/lib/auth-session";

const KEY = "samvaad-resume-storage-receipt";
export const RESUME_RECEIPT_EVENT = "samvaad-resume-receipt";
export function rememberResumeReceipt(value: unknown, revision: number): void {
  assertAuthRevision(revision);
  const hash = (value as { fileSha256?: unknown } | null)?.fileSha256;
  if (typeof hash !== "string" || !/^[a-f0-9]{64}$/i.test(hash)) return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ owner: getAuthStorageOwner(), hash: hash.toLowerCase() })
    );
    window.dispatchEvent(new Event(RESUME_RECEIPT_EVENT));
  } catch {
    /* Storage denial must not turn an acknowledged save into a failure. */
  }
}
export function readResumeFingerprint(): string | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    const owner = getAuthStorageOwner();
    if (owner === "anonymous" || owner.startsWith("opaque:") || value?.owner !== owner) return null;
    return typeof value.hash === "string" && /^[a-f0-9]{64}$/.test(value.hash) ? value.hash : null;
  } catch {
    return null;
  }
}
export function parseStorageStatus(value: unknown, hash: string): "registered" | "unconfirmed" {
  const receipt = value as { fileSha256?: unknown; status?: unknown; resumeId?: unknown } | null;
  if (receipt?.fileSha256 !== hash) throw new Error("The file check could not be verified.");
  if (
    receipt.status === "registered" &&
    typeof receipt.resumeId === "number" &&
    Number.isSafeInteger(receipt.resumeId) &&
    receipt.resumeId > 0
  )
    return "registered";
  if (receipt.status === "unconfirmed" && receipt.resumeId == null) return "unconfirmed";
  throw new Error("The file check could not be verified.");
}

export type ResumeDeliveryStatus = "pending" | "failed" | "expired" | null;

export function parseDeliveryStatus(value: unknown, hash: string): ResumeDeliveryStatus {
  const storage = parseStorageStatus(value, hash);
  const delivery = (value as { deliveryStatus?: unknown }).deliveryStatus;
  if (storage === "registered") return null;
  // Missing fields remain compatible with older API versions.
  if (delivery == null) return null;
  if (delivery === "pending" || delivery === "failed" || delivery === "expired") return delivery;
  throw new Error("The delivery check could not be verified.");
}

/** Remember the exact bytes before dispatch, even if the HTTP response is later lost. */
export async function prepareResumeUpload(file: File, revision: number): Promise<string> {
  assertAuthRevision(revision);
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error("Could not read your resume file."));
    reader.onerror = () =>
      reject(new Error("Could not read your resume file. Please select it again."));
    reader.onabort = () =>
      reject(new Error("Resume preparation was interrupted. Please select the file again."));
    reader.readAsArrayBuffer(file);
  });
  assertAuthRevision(revision);
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Secure file preparation is unavailable. Open the platform over HTTPS and try again."
    );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  assertAuthRevision(revision);
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  rememberResumeReceipt({ fileSha256: hash }, revision);
  return hash;
}

const OPERATION_KEY = "samvaad-resume-operation";
export function readResumeOperation(hash: string): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(OPERATION_KEY) || "null");
    return saved?.owner === getAuthStorageOwner() &&
      saved?.hash === hash &&
      typeof saved?.key === "string" &&
      /^[a-f0-9-]{36}$/.test(saved.key)
      ? saved.key
      : null;
  } catch {
    return null;
  }
}
export function resumeOperationKey(hash: string, revision: number): string {
  assertAuthRevision(revision);
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("The resume fingerprint is invalid.");
  const existing = readResumeOperation(hash);
  if (existing) return existing;
  try {
    const key = crypto.randomUUID();
    sessionStorage.setItem(
      OPERATION_KEY,
      JSON.stringify({ owner: getAuthStorageOwner(), hash, key })
    );
    if (readResumeOperation(hash) !== key) throw new Error("Storage unavailable");
    return key;
  } catch {
    throw new Error(
      "Allow browser storage before uploading so interrupted requests can be recovered safely."
    );
  }
}

export function acceptResumeRecovery(
  hash: string,
  previous: string,
  value: unknown,
  revision: number
): void {
  assertAuthRevision(revision);
  if (readResumeOperation(hash) !== previous)
    throw new Error("The upload changed. Check its status again.");
  const receipt = value as { operationKey?: unknown; fileSha256?: unknown } | null;
  if (
    receipt?.fileSha256 !== hash ||
    typeof receipt.operationKey !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(receipt.operationKey) ||
    receipt.operationKey === previous
  )
    throw new Error("The recovery request could not be verified.");
  try {
    sessionStorage.setItem(
      OPERATION_KEY,
      JSON.stringify({ owner: getAuthStorageOwner(), hash, key: receipt.operationKey })
    );
    if (readResumeOperation(hash) !== receipt.operationKey) throw new Error("Storage unavailable");
  } catch {
    throw new Error("Allow browser storage before preparing another attempt.");
  }
}
