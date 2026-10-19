"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { validInterviewId } from "@/lib/interview-history";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIService } from "@/lib/api-config/src/config";

export interface SubmissionReceiptData {
  planned: number;
  answered: number;
  skipped: number;
  unresolved: number;
  unreached: number;
  reason: string;
}

export function ReceiptSummary({ receipt }: { receipt: SubmissionReceiptData }) {
  return (
    <section
      className="rounded-xl border border-[#DEE8FB] bg-white p-5 text-left"
      aria-label="Submission receipt"
    >
      <h2 className="font-semibold text-[#1F285B]">
        {receipt.planned} planned · {receipt.answered} answers saved
      </h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        {receipt.skipped} skipped · {receipt.unresolved} unresolved · {receipt.unreached} unreached
      </p>
      {receipt.reason === "time_limit" && (
        <p className="mt-2 text-sm text-gray-700">
          Time ended before all questions were resolved. Your saved answers remain available.
        </p>
      )}
    </section>
  );
}

export default function SubmissionReceipt({ interviewId }: { interviewId: string | null }) {
  const { user, loading } = useAuth();
  const account = user?.userId;
  const client = createApiClient(APIService.INTERVIEWS);
  const { data, error, refetch } = client.useQuery<{ receipt: SubmissionReceiptData | null }>({
    key: ["submission-receipt", String(account), interviewId],
    url: `interviews/${interviewId}/receipt`,
    enabled: !!account && !loading && validInterviewId(interviewId),
    options: { staleTime: 0, gcTime: 0, retry: false },
  });
  if (error)
    return (
      <p className="text-sm text-gray-600">
        Receipt details could not be loaded.{" "}
        <button type="button" className="min-h-11 underline" onClick={() => void refetch()}>
          Retry receipt
        </button>
      </p>
    );
  return data?.receipt ? <ReceiptSummary receipt={data.receipt} /> : null;
}
