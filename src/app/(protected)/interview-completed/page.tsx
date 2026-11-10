"use client";

import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";

import { useAuth } from "@/components/providers/auth-provider";
import { ReceiptSummary } from "@/components/interview/SubmissionReceipt";
import { apiClient } from "@/lib/api-config";
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
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const action =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]";

function CompletionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl py-6 [overflow-wrap:anywhere] sm:py-10">
      <section className="studio-panel space-y-5">
        <p className="studio-eyebrow">Interview submission</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#1F285B]">{title}</h1>
        {children}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/history"
            className="inline-flex min-h-11 items-center rounded-xl border border-[#344499] px-5 py-3 font-semibold text-[#344499]"
          >
            Open Progress
          </Link>
          <Link href="/home" className="ws-button">
            Go to Home
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
          This link isn't right. Find your interview in Progress.
        </p>
      </CompletionCard>
    );
  if (loading || !user?.userId)
    return (
      <CompletionCard title="Just a moment">
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
  const ownerRevision = useRef(getAuthRevision()).current;
  const router = useRouter();
  const client = createApiClient(APIServiceV2.INTERVIEWS);
  const current = useRef(true);
  const inFlight = useRef(false);
  const autoPreparationStarted = useRef(false);
  const [retryWarning, setRetryWarning] = useState(false);
  const [generation, setGeneration] = useState<"idle" | "pending" | "uncertain" | "confirmed">(
    "idle"
  );
  const completion = useQuery({
    queryKey: ["completion-status", account, interviewId],
    queryFn: async ({ signal }) => {
      assertAuthRevision(ownerRevision);
      const value = await client.get<unknown>(`interviews/${interviewId}/receipt`, { signal });
      assertAuthRevision(ownerRevision);
      return parseCompletionEnvelope(value, interviewId);
    },
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
      assertAuthRevision(ownerRevision);
      const value = await client.get<unknown>(`${ENDPOINTS_V2.SUMMARY_REPORT}/${interviewId}`, {
        signal,
      });
      assertAuthRevision(ownerRevision);
      if (!hasReportEnvelope(value)) throw new Error("We couldn't open your feedback.");
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
  const typical = apiClient.useQuery<{ typical_minutes: number | null }>({
    key: ["feedback-time"],
    url: "v2/student-home/feedback-time",
    options: { retry: false, staleTime: 300_000 },
  });
  const minutes = typical.isError ? null : (typical.data?.typical_minutes ?? null);
  const post = client.useMutation<unknown, { interviewId: number }>({
    url: ENDPOINTS_V2.SUMMARY_REPORT,
    method: "post",
    showToastError: false,
    options: { retry: false },
  });

  // Nobody decides whether an AI report goes out, so once the submission is confirmed we
  // prepare feedback automatically, for mock interviews and assessments alike.
  // The ref guarantees one request per mounted completion view even under React
  // StrictMode, duplicate UI events, or a slow network response.
  useEffect(() => {
    const reportIsMissing = responseStatus(existing.error) === 404;
    const isCompleted = completion.data?.status === "completed";
    if (
      !isCompleted ||
      !reportIsMissing ||
      existing.isFetching ||
      generation !== "idle" ||
      autoPreparationStarted.current ||
      inFlight.current
    ) {
      return;
    }
    autoPreparationStarted.current = true;
    inFlight.current = true;
    setGeneration("pending");
    trackEvent("feedback_preparation_requested", {
      source: "completion_automatic",
    });
    void post
      .mutateAsync({ interviewId: Number(interviewId) })
      .then(() => {
        if (!current.current || getAuthRevision() !== ownerRevision || !verifiedNow.current) {
          return;
        }
        setGeneration("confirmed");
        router.replace(`/report-summary?interviewId=${interviewId}`);
      })
      .catch(() => {
        if (current.current && getAuthRevision() === ownerRevision) {
          setGeneration("uncertain");
          setRetryWarning(true);
        }
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [
    completion.data?.interviewMode,
    completion.data?.status,
    existing.error,
    existing.isFetching,
    generation,
    interviewId,
    ownerRevision,
    post,
    router,
  ]);

  if (completion.isFetching || (!completion.data && !completion.error))
    return (
      <CompletionCard title="Saving your interview">
        <p role="status">Your answers are safe. This only takes a moment.</p>
      </CompletionCard>
    );
  if (completion.isError || !completion.data) {
    const code = responseStatus(completion.error);
    return (
      <CompletionCard title="We couldn't check your interview">
        <p role="alert">
          {code === 401 || code === 403 || code === 404
            ? "This interview isn't on this account. Check that you are signed in to the right one."
            : "Your answers are safe. Please try again in a moment."}
        </p>
        <button type="button" className={action} onClick={() => void completion.refetch()}>
          Try again
        </button>
      </CompletionCard>
    );
  }
  if (!verified)
    return (
      <CompletionCard title="We're still saving your interview">
        <p role="status">
          Your answers are safe. You can check again here, or find this interview in Progress.
        </p>
        <button type="button" className={action} onClick={() => void completion.refetch()}>
          Try again
        </button>
      </CompletionCard>
    );
  const receipt = completion.data.receipt;
  const missing = responseStatus(existing.error) === 404;
  const denied = [401, 403].includes(responseStatus(existing.error) ?? 0);
  const canPrepare =
    missing && (generation === "idle" || generation === "uncertain") && !existing.isFetching;
  return (
    <CompletionCard
      title={
        completion.data.interviewMode === "assessment"
          ? "Your assessment is submitted"
          : "Well done. Your interview is saved."
      }
    >
      {!existing.isSuccess && (
        <p>
          {minutes
            ? `Feedback usually takes about ${minutes} ${minutes === 1 ? "minute" : "minutes"}. We'll let you know when it's ready.`
            : "Feedback usually takes a few minutes. We'll let you know when it's ready."}
        </p>
      )}
      {receipt ? (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer font-semibold">See what was saved</summary>
          <ReceiptSummary receipt={receipt} />
        </details>
      ) : null}
      {retryWarning && (
        <p role="status" className="text-sm text-gray-600">
          Your feedback may still be on its way. Give it a minute before trying again.
        </p>
      )}
      <div className="space-y-3 rounded-2xl bg-[#F5F9FF] p-5" aria-live="polite">
        {generation === "pending" ? (
          <p role="status">
            We&apos;re preparing your feedback. You can leave this page and it will keep going.
          </p>
        ) : existing.isFetching ? (
          <p role="status">Looking for your feedback…</p>
        ) : existing.isSuccess ? (
          <>
            <p>Your feedback is ready.</p>
            <Link href={`/report-summary?interviewId=${interviewId}`} className={action}>
              See your feedback
            </Link>
          </>
        ) : (
          <>
            <p role={missing ? "status" : "alert"}>
              {denied
                ? "We couldn't open your feedback. Check that you are signed in to the right account."
                : generation === "uncertain"
                  ? "Your feedback is taking longer than usual. Check again in a minute."
                  : missing
                    ? "We're preparing your feedback."
                    : "We couldn't check your feedback. Please try again."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={action}
                disabled={existing.isFetching}
                onClick={async () => {
                  if (!current.current || getAuthRevision() !== ownerRevision) return;
                  const result = await existing.refetch();
                  if (
                    current.current &&
                    getAuthRevision() === ownerRevision &&
                    result.isError &&
                    responseStatus(result.error) === 404
                  )
                    setGeneration("idle");
                }}
              >
                Check again
              </button>
              {canPrepare && (
                <button
                  type="button"
                  className={action}
                  onClick={async () => {
                    if (!current.current || getAuthRevision() !== ownerRevision || inFlight.current)
                      return;
                    inFlight.current = true;
                    setGeneration("pending");
                    trackEvent("feedback_preparation_requested", { source: "verified_completion" });
                    try {
                      await post.mutateAsync({ interviewId: Number(interviewId) });
                      if (!current.current || getAuthRevision() !== ownerRevision) return;
                      if (!verifiedNow.current) {
                        setGeneration("uncertain");
                        setRetryWarning(true);
                        return;
                      }
                      setGeneration("confirmed");
                      // The report view performs its own fresh read and schema checks.
                      router.replace(`/report-summary?interviewId=${interviewId}`);
                    } catch {
                      if (current.current && getAuthRevision() === ownerRevision) {
                        setGeneration("uncertain");
                        setRetryWarning(true);
                      }
                    } finally {
                      inFlight.current = false;
                    }
                  }}
                >
                  {generation === "uncertain" ? "Ask for feedback again" : "Get my feedback"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {completion.data.interviewMode === "practice" && !existing.isSuccess && (
        <Link href="/warm-up-chat" className="block min-h-11 font-semibold underline">
          While you wait, try a two-minute warm-up
        </Link>
      )}
    </CompletionCard>
  );
}
