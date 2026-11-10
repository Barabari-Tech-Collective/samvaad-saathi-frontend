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
            throw new Error("Something went wrong. Please try again.");
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
                  ? "Your resume is saved."
                  : "We're not sure your resume saved. Please ask your teacher before trying again."
                : operation.state === "failed"
                  ? "We couldn't read your resume. Please ask your teacher before trying again."
                  : "We're still reading your resume. Check back in a moment."
            );
          }
        } catch {
          if (current()) {
            setRecoverable(null);
            setOperationMessage(
              "We couldn't check that. Please try again."
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
        "You can try again now. Choose the same file and upload it."
      );
    } catch {
      if (current())
        setOperationMessage(
          "That didn't work. Please try again."
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
        "Your file is saved. Your profile didn't change."
      );
    } catch {
      if (current())
        setRepairMessage(
          "We're not sure your file saved. Choose the same file and try again."
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
          ? "Checking your file…"
          : status === "registered"
            ? "Your file is saved."
            : status === "unconfirmed" && delivery === "pending"
              ? "Your file is on its way. You can leave this page and check again later."
              : status === "unconfirmed" && delivery === "failed"
                ? "We couldn't save your original file. Your resume details may still be saved, so check below before uploading it again."
                : status === "unconfirmed" && delivery === "expired"
                  ? "Your original file wasn't saved in time. Upload it again below, or ask your teacher."
                  : status === "unconfirmed"
                    ? "We couldn't find this file. Check again later, or ask your teacher."
                    : status === "error"
                      ? "We couldn't check your file. Please try again."
                      : "Not checked yet."}
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
            Your resume details are saved. Choose the same file to add it back. Nothing else will
            change.
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
            Check your Profile first, as your details may already be there. Trying again can replace
            them.
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
