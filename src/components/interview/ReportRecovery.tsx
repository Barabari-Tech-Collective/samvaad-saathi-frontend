"use client";
import Link from "next/link";
import SubmissionReceipt from "./SubmissionReceipt";
import { reportRecoveryCopy } from "@/lib/practice-report";
export default function ReportRecovery({
  kind,
  onRetry,
  interviewId,
}: {
  kind: "invalid" | "checking" | "missing" | "denied" | "unavailable" | "malformed";
  onRetry?: () => void;
  interviewId?: string;
}) {
  const copy = reportRecoveryCopy(kind);
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-2xl py-8 [overflow-wrap:anywhere]"
      role={kind === "checking" ? "status" : "alert"}
    >
      <section className="rounded-3xl border border-[#DEE8FB] bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#344499]">
          Interview feedback
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[#1F285B]">{copy.title}</h1>
        <p className="mt-3 leading-7 text-gray-600">{copy.body}</p>
        {interviewId && (
          <div className="mt-5">
            <SubmissionReceipt interviewId={interviewId} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry && kind !== "checking" && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 rounded-xl bg-black px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]"
            >
              Try loading report again
            </button>
          )}
          <Link
            href="/history?tab=completed"
            className="inline-flex min-h-11 items-center rounded-xl border border-[#344499] px-5 py-3 font-semibold text-[#344499]"
          >
            Return to history
          </Link>
        </div>
      </section>
    </div>
  );
}
