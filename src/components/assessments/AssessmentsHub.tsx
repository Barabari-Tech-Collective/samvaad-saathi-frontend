"use client";

import PageHeading from "@/components/studio/PageHeading";
import {
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api-config";

type AssignmentPhase = "upcoming" | "open" | "closed" | "started" | "completed";

type AiAssignment = {
  id: number;
  jobName: string;
  phase: AssignmentPhase;
};

function assignedAiInterviews(value: unknown): AiAssignment[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items))
    return null;
  const items: AiAssignment[] = [];
  for (const item of (value as { items: unknown[] }).items) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (
      !Number.isSafeInteger(row.id) ||
      typeof row.job_name !== "string" ||
      row.job_name.trim().length === 0 ||
      !["upcoming", "open", "closed", "started", "completed"].includes(String(row.phase))
    )
      return null;
    items.push({
      id: row.id as number,
      jobName: row.job_name.trim(),
      phase: row.phase as AssignmentPhase,
    });
  }
  return items;
}

function AssessmentCard({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  icon: typeof ClipboardDocumentCheckIcon;
}) {
  return (
    <article className="studio-panel flex min-h-64 flex-col items-start gap-4">
      <span className="ws-feature-icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-[#1F285B]">{title}</h2>
        <p className="text-gray-700">{description}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </article>
  );
}

export default function AssessmentsHub() {
  const { user, loading } = useAuth();
  const assignments = apiClient.useQuery<unknown>({
    key: ["assessment-assignments", "me", String(user?.userId ?? "")],
    url: "v2/assessment-assignments/me",
    enabled: Boolean(user?.userId),
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const aiInterviews =
    assignments.isError || assignments.isFetching || loading
      ? undefined
      : assignedAiInterviews(assignments.data);
  const invalidAssignmentResponse =
    !assignments.isError && !assignments.isFetching && !loading && aiInterviews === null;
  const openAiInterview = aiInterviews?.find((assignment) => assignment.phase === "open");
  const upcomingAiInterview = aiInterviews?.find((assignment) => assignment.phase === "upcoming");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10 pt-4 [overflow-wrap:anywhere] sm:pt-7">
      <PageHeading
        eyebrow="Formal assessments"
        title="Assessments"
        description="Your placement team may assign either an AI Interview or a Human Interview. These are separate from Mock Interviews."
      />
      <section className="studio-panel space-y-3" aria-label="Assessment information">
        <h2 className="text-lg font-semibold text-[#1F285B]">Choose the round you were assigned</h2>
        <p className="text-gray-700">
          An assessment is shown only when your placement team has made it available. It has its own
          instructions, timing and result-release policy.
        </p>
      </section>
      <section aria-label="Assessment round types" className="grid gap-5 md:grid-cols-2">
        <AssessmentCard
          title="AI Interview"
          description="Complete an assigned assessment in Samvaad Saathi. Your placement team sets the role, instructions and rules."
          icon={ClipboardDocumentCheckIcon}
        >
          {aiInterviews === undefined ? (
            <output>Checking for an assigned AI Interview…</output>
          ) : assignments.isError || invalidAssignmentResponse ? (
            <div className="space-y-2" role="alert">
              <p>We could not verify your AI Interview assignment.</p>
              <button className="ws-button" onClick={() => void assignments.refetch()}>
                Try again
              </button>
            </div>
          ) : openAiInterview ? (
            <Link className="ws-button ws-button-primary" href="/interview-start?mode=assessment">
              Open {openAiInterview.jobName} <ArrowRightIcon aria-hidden="true" />
            </Link>
          ) : upcomingAiInterview ? (
            <p className="text-sm text-gray-600">
              {upcomingAiInterview.jobName} is assigned, but its interview window has not opened
              yet.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              No AI Interview is assigned right now. Your placement team will add it here when it is
              ready.
            </p>
          )}
        </AssessmentCard>
        <AssessmentCard
          title="Human Interview"
          description="See a scheduled meeting, preparation instructions and the verified link to join your interviewer."
          icon={VideoCameraIcon}
        >
          <Link className="ws-button ws-button-primary" href="/human-interviews">
            View Human Interviews <ArrowRightIcon aria-hidden="true" />
          </Link>
        </AssessmentCard>
      </section>
      <section className="flex flex-wrap items-center gap-3 text-sm">
        <Link className="ws-button" href="/assessment-reviews">
          View assessment reviews
        </Link>
        <p className="text-gray-600">
          A review notice is not a result and does not change your score by itself.
        </p>
      </section>
    </div>
  );
}
