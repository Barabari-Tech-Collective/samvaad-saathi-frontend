"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ReceiptSummary } from "@/components/interview/SubmissionReceipt";
import { createApiClient } from "@/lib/api-config/src/client";
import { APIServiceV2 } from "@/lib/api-config/src/config";
import { ENDPOINTS_V2 } from "@/lib/api-config/src/endpoints";
import { hasReportEnvelope } from "@/lib/practice-report";
import { responseStatus, validInterviewId } from "@/lib/interview-history";
import { parseCompletionEnvelope } from "@/lib/submission-receipt";
import { trackEvent } from "@/lib/posthog/tracking.utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const action =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]";

function CompletionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl py-6 [overflow-wrap:anywhere] sm:py-10">
      <section className="space-y-5 rounded-3xl border border-[#DEE8FB] bg-white p-5 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#344499]">
          Interview submission
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[#1F285B]">{title}</h1>
        {children}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/history"
            className="inline-flex min-h-11 items-center rounded-xl border border-[#344499] px-5 py-3 font-semibold text-[#344499]"
          >
            View history
          </Link>
          <Link
            href="/practice"
            className="inline-flex min-h-11 items-center px-5 py-3 font-semibold text-[#344499]"
          >
            Back to practice
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function InterviewCompleted() {
  const interviewId = useSearchParams().get("interviewId");
  const { user, loading } = useAuth();
  if (!validInterviewId(interviewId))
    return (
      <CompletionCard title="Check this interview link">
        <p role="alert">
          This link does not identify a valid interview. Open your session from History.
        </p>
      </CompletionCard>
    );
  if (loading || !user?.userId)
    return (
      <CompletionCard title="Checking your session">
        <p role="status">
          Sign in to the account that owns this interview before checking its submission.
        </p>
      </CompletionCard>
    );
  return (
    <VerifiedCompletion
      key={`${user.userId}:${interviewId}`}
      account={String(user.userId)}
      interviewId={interviewId}
    />
  );
}

function VerifiedCompletion({ account, interviewId }: { account: string; interviewId: string }) {
  const router = useRouter();
  const client = createApiClient(APIServiceV2.INTERVIEWS);
  const current = useRef(true);
  const inFlight = useRef(false);
  const [retryWarning, setRetryWarning] = useState(false);
  const [generation, setGeneration] = useState<"idle" | "pending" | "uncertain" | "confirmed">(
    "idle"
  );
  const completion = useQuery({
    queryKey: ["completion-status", account, interviewId],
    queryFn: async ({ signal }) =>
      parseCompletionEnvelope(
        await client.get<unknown>(`interviews/${interviewId}/receipt`, { signal }),
        interviewId
      ),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const verified =
    !completion.isFetching && !completion.isError && completion.data?.status === "completed";
  const verifiedNow = useRef(false);
  useLayoutEffect(() => {
    verifiedNow.current = verified;
  }, [verified]);
  const existing = useQuery({
    queryKey: ["completion-report", account, interviewId],
    queryFn: async ({ signal }) => {
      const value = await client.get<unknown>(`${ENDPOINTS_V2.SUMMARY_REPORT}/${interviewId}`, {
        signal,
      });
      if (!hasReportEnvelope(value)) throw new Error("Feedback details could not be verified.");
      return value;
    },
    enabled: verified,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  useLayoutEffect(() => {
    current.current = true;
    return () => {
      current.current = false;
    };
  }, []);
  const post = client.useMutation<unknown, { interviewId: number }>({
    url: ENDPOINTS_V2.SUMMARY_REPORT,
    method: "post",
    showToastError: false,
    options: { retry: false },
  });

  if (completion.isFetching || (!completion.data && !completion.error))
    return (
      <CompletionCard title="Checking submission">
        <p role="status">Confirming the session status from your account…</p>
      </CompletionCard>
    );
  if (completion.isError || !completion.data) {
    const code = responseStatus(completion.error);
    return (
      <CompletionCard title="Submission could not be verified">
        <p role="alert">
          {code === 401 || code === 403 || code === 404
            ? "This session is unavailable to your account. Check History and your sign-in before continuing."
            : "The saved status could not be loaded or verified. This page cannot confirm completion yet."}
        </p>
        <button type="button" className={action} onClick={() => void completion.refetch()}>
          Check submission again
        </button>
      </CompletionCard>
    );
  }
  if (!verified)
    return (
      <CompletionCard title="Completion is not confirmed">
        <p role="status">
          The server has not marked this session completed. Return through History to check its
          current state. Opening this page does not submit or reopen an interview.
        </p>
        <button type="button" className={action} onClick={() => void completion.refetch()}>
          Check submission again
        </button>
      </CompletionCard>
    );
  const receipt = completion.data.receipt;
  const missing = responseStatus(existing.error) === 404;
  const denied = [401, 403].includes(responseStatus(existing.error) ?? 0);
  const canPrepare = missing && generation === "idle" && !existing.isFetching;
  return (
    <CompletionCard
      title={
        completion.data.interviewMode === "assessment"
          ? "Assessment submission confirmed"
          : completion.data.interviewMode === "practice"
            ? "Practice submission confirmed"
            : "Interview submission confirmed"
      }
    >
      <p>
        The server confirms this session is completed. Feedback availability is checked separately.
      </p>
      {receipt ? (
        <ReceiptSummary receipt={receipt} />
      ) : (
        <p role="status">
          This completed session has no detailed receipt. Saved-answer counts cannot be confirmed
          from this response.
        </p>
      )}
      {retryWarning && (
        <p role="status" className="text-sm text-gray-600">
          An earlier request may still finish. Another preparation request may repeat processing;
          you can wait and check feedback again.
        </p>
      )}
      <div className="space-y-3 rounded-2xl bg-[#F5F9FF] p-5" aria-live="polite">
        {generation === "pending" ? (
          <p role="status">
            Preparing feedback. You can check History if you leave this page; leaving does not
            cancel an accepted request.
          </p>
        ) : existing.isFetching ? (
          <p role="status">Checking for saved feedback…</p>
        ) : existing.isSuccess ? (
          <>
            <p>Saved feedback is available.</p>
            <Link href={`/report-summary?interviewId=${interviewId}`} className={action}>
              Open feedback
            </Link>
          </>
        ) : (
          <>
            <p role={missing ? "status" : "alert"}>
              {denied
                ? "Feedback access could not be verified. Check your account and History."
                : generation === "uncertain"
                  ? "Preparation was not confirmed. Check for saved feedback before sending another preparation request."
                  : missing
                    ? "No saved feedback was found. You can request preparation for this completed session."
                    : "Feedback availability could not be checked. Retry the check before requesting preparation."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={action}
                disabled={existing.isFetching}
                onClick={async () => {
                  const result = await existing.refetch();
                  if (current.current && result.isError && responseStatus(result.error) === 404)
                    setGeneration("idle");
                }}
              >
                Check feedback again
              </button>
              {canPrepare && (
                <button
                  type="button"
                  className={action}
                  onClick={async () => {
                    if (inFlight.current) return;
                    inFlight.current = true;
                    setGeneration("pending");
                    trackEvent("feedback_preparation_requested", { source: "verified_completion" });
                    try {
                      await post.mutateAsync({ interviewId: Number(interviewId) });
                      if (!current.current) return;
                      if (!verifiedNow.current) {
                        setGeneration("uncertain");
                        setRetryWarning(true);
                        return;
                      }
                      setGeneration("confirmed");
                      // The report view performs its own fresh read and schema checks.
                      router.replace(`/report-summary?interviewId=${interviewId}`);
                    } catch {
                      if (current.current) {
                        setGeneration("uncertain");
                        setRetryWarning(true);
                      }
                    } finally {
                      inFlight.current = false;
                    }
                  }}
                >
                  Prepare feedback
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </CompletionCard>
  );
}
