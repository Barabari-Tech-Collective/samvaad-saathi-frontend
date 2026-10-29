"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthRevision } from "@/lib/auth-session";
import { accountJson } from "@/lib/account-request";
import {
  acceptResumeRecovery,
  readResumeOperation,
  parseStorageStatus,
  parseDeliveryStatus,
  type ResumeDeliveryStatus,
  readResumeFingerprint,
  RESUME_RECEIPT_EVENT,
} from "@/lib/resume-storage-recovery";

export default function ResumeStorageRecovery() {
  const owner = useRef(getAuthRevision()).current;
  const [hash, setHash] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "registered" | "unconfirmed" | "error">("idle");
  const [delivery, setDelivery] = useState<ResumeDeliveryStatus>(null);
  const [operationMessage, setOperationMessage] = useState("");
  const [repairKey, setRepairKey] = useState<string | null>(null);
  const [repairFile, setRepairFile] = useState<File | null>(null);
  const [repairMessage, setRepairMessage] = useState("");
  const [recoverable, setRecoverable] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => {
    const lifetime = version;
    const refresh = () => {
      lifetime.current++;
      inFlight.current = false;
      setBusy(false);
      setHash(readResumeFingerprint());
      setStatus("idle");
      setDelivery(null);
      setOperationMessage("");
      setRecoverable(null);
      setRepairKey(null);
      setRepairFile(null);
      setRepairMessage("");
    };
    refresh();
    window.addEventListener(RESUME_RECEIPT_EVENT, refresh);
    return () => {
      lifetime.current++;
      window.removeEventListener(RESUME_RECEIPT_EVENT, refresh);
    };
  }, []);
  if (!hash) return null;
  const check = async () => {
    if (inFlight.current || getAuthRevision() !== owner) return;
    const requestVersion = version.current;
    const current = () => requestVersion === version.current && getAuthRevision() === owner;
    inFlight.current = true;
    setBusy(true);
    setRecoverable(null);
    setRepairKey(null);
    setOperationMessage("");
    setRepairMessage("");
    try {
      const receipt = await accountJson(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/me/resume-storage/${hash}`,
        owner
      );
      const nextStatus = parseStorageStatus(receipt, hash);
      const nextDelivery = parseDeliveryStatus(receipt, hash);
      if (current()) {
        setStatus(nextStatus);
        setDelivery(nextDelivery);
      }
      const key = readResumeOperation(hash);
      if (key && current()) {
        try {
          const operation = await accountJson<{
            operationKey: string;
            fileSha256: string;
            state: string;
            dataSaved: boolean;
          }>(`${process.env.NEXT_PUBLIC_API_BASE_URL}/me/resume-operations/${key}`, owner);
          if (
            operation.operationKey !== key ||
            operation.fileSha256 !== hash ||
            !["started", "completed", "failed"].includes(operation.state) ||
            typeof operation.dataSaved !== "boolean"
          )
            throw new Error("Invalid operation receipt");
          if (current()) {
            setRepairKey(operation.state === "completed" && operation.dataSaved ? key : null);
            setRecoverable(
              operation.state === "failed" ||
                (operation.state === "completed" && !operation.dataSaved)
                ? key
                : null
            );
            setOperationMessage(
              operation.state === "completed"
                ? operation.dataSaved
                  ? "The extraction operation confirms your résumé data was saved."
                  : "The extraction finished without confirming saved résumé data. Contact your program team before retrying."
                : operation.state === "failed"
                  ? "The extraction operation failed. Check the saved file result and contact your program team before starting another attempt."
                  : "The extraction started, but its outcome is not confirmed. It will not be automatically repeated."
            );
          }
        } catch {
          if (current()) {
            setRecoverable(null);
            setOperationMessage(
              "The extraction operation could not be checked. This does not confirm failure; try checking again."
            );
          }
        }
      }
    } catch {
      if (current()) {
        setStatus("error");
        setDelivery(null);
      }
    } finally {
      if (current()) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const recover = async () => {
    if (!recoverable || inFlight.current || getAuthRevision() !== owner) return;
    const requestVersion = version.current;
    const current = () => requestVersion === version.current && getAuthRevision() === owner;
    inFlight.current = true;
    setBusy(true);
    try {
      const receipt = await accountJson(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/me/resume-operations/${recoverable}/recovery`,
        owner,
        { method: "POST" }
      );
      if (!current()) return;
      acceptResumeRecovery(hash, recoverable, receipt, owner);
      setRecoverable(null);
      setOperationMessage(
        "Another attempt is ready. Select the same file and submit the upload when you are ready. Nothing has been uploaded again yet."
      );
    } catch {
      if (current())
        setOperationMessage(
          "Another attempt could not be prepared. Check the operation again; no upload was sent."
        );
    } finally {
      if (current()) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const repair = async () => {
    if (!repairKey || !repairFile || inFlight.current || getAuthRevision() !== owner) return;
    if (repairFile.size === 0 || repairFile.size > 5 * 1024 * 1024) {
      setRepairMessage("Choose the original file, up to 5 MB.");
      return;
    }
    const requestVersion = version.current;
    const current = () => requestVersion === version.current && getAuthRevision() === owner;
    inFlight.current = true;
    setBusy(true);
    setRepairMessage("");
    const body = new FormData();
    body.append("file", repairFile);
    try {
      const receipt = await accountJson(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/me/resume-operations/${repairKey}/restore-file`,
        owner,
        { method: "POST", body }
      );
      if (!current()) return;
      if (parseStorageStatus(receipt, hash) !== "registered") throw new Error("Unconfirmed repair");
      setStatus("registered");
      setDelivery(null);
      setRepairFile(null);
      setRepairMessage(
        "Your exact file has a saved record. AI extraction and profile data were not changed."
      );
    } catch {
      if (current())
        setRepairMessage(
          "Storage was not confirmed. Check file storage before retrying, and make sure you selected the exact original file."
        );
    } finally {
      if (current()) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <section className="studio-panel space-y-3" aria-labelledby="resume-storage-title">
      <h2 id="resume-storage-title" className="text-lg font-semibold">
        Check your latest résumé file
      </h2>
      <p className="text-sm">
        Check the latest file prepared for upload in this tab, even if its upload response was lost.
        This does not upload it again.
      </p>
      <p role="status" aria-live="polite">
        {busy
          ? "Checking saved file records…"
          : status === "registered"
            ? "This exact file has a saved record in your account. This confirms a saved file record, not that your latest profile changes were completed."
            : status === "unconfirmed" && delivery === "pending"
              ? "Your original file is queued for storage. You can leave this page; delivery does not repeat AI extraction. Check again later."
              : status === "unconfirmed" && delivery === "failed"
                ? "Automatic file delivery stopped after unsuccessful attempts. Your résumé data may still be saved. Check the extraction result below before restoring the original file."
                : status === "unconfirmed" && delivery === "expired"
                  ? "The file delivery window has ended. Check the extraction result below to restore the original file, or contact your program team."
                  : status === "unconfirmed"
                    ? "No saved record was found for this file. Storage may be delayed, unsuccessful, or the file may have been removed. Check again later or contact your program team."
                    : status === "error"
                      ? "The file check could not be completed. Try checking again; no file was uploaded."
                      : "File storage has not been checked in this visit."}
      </p>
      {operationMessage && (
        <p role="status" className="text-sm">
          {operationMessage}
        </p>
      )}
      {repairMessage && (
        <p role="status" className="text-sm">
          {repairMessage}
        </p>
      )}
      {repairKey && status === "unconfirmed" && delivery !== "pending" && (
        <div className="space-y-2">
          <p className="text-sm">
            Your extraction is saved. Restore only the missing file by selecting the exact original.
            This will not repeat AI extraction or change profile data. The normal three-file limit
            still applies.
          </p>
          <label className="block text-sm" htmlFor="resume-repair-file">
            Original résumé file
          </label>
          <input
            id="resume-repair-file"
            type="file"
            accept=".pdf,.txt"
            disabled={busy}
            className="block w-full min-w-0 text-base"
            onChange={(event) => {
              setRepairFile(event.target.files?.[0] ?? null);
              setRepairMessage("");
            }}
          />
          <button
            type="button"
            className="ws-button"
            disabled={busy || !repairFile}
            onClick={() => void repair()}
          >
            Restore file only
          </button>
        </div>
      )}
      {recoverable && (
        <div className="space-y-2">
          <p className="text-sm">
            Review your Profile first: earlier writes may already exist. A new attempt can repeat
            extraction and replace résumé data. This button prepares it; you still choose when to
            upload.
          </p>
          <button
            type="button"
            className="ws-button"
            disabled={busy}
            onClick={() => void recover()}
          >
            Prepare another attempt
          </button>
        </div>
      )}
      <button type="button" className="ws-button" disabled={busy} onClick={() => void check()}>
        {busy ? "Checking…" : "Check file storage"}
      </button>
    </section>
  );
}
