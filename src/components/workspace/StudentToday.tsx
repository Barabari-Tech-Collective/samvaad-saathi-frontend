"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { apiClient, ENDPOINTS } from "@/lib/api-config";
import { drillHref, parseLearningPlanPage } from "@/lib/learning-plans";
import { parseMockAssignments } from "@/lib/mock-assignments";
import { parseHumanInterviewsPage } from "@/lib/human-interviews";

type Action = { title: string; detail: string; href: string; priority: number };

function assessmentAction(value: unknown): Action | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items))
    return null;
  const row = (value as { items: unknown[] }).items.find((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return (
      record.interview_mode === "assessment" &&
      ["active", "paused", "preparing"].includes(record.status as string) &&
      Number.isSafeInteger(record.interview_id) &&
      (record.interview_id as number) > 0 &&
      typeof record.track === "string" &&
      record.track.trim().length > 0 &&
      record.track.length <= 160
    );
  });
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const track = record.track;
  if (typeof track !== "string" || !track.trim() || track.length > 160) return null;
  return {
    title: `Continue AI Interview: ${track.trim()}`,
    detail: "Your placement assessment is ready to continue.",
    href: `/interview?interviewId=${record.interview_id}&interviewMode=assessment`,
    priority: 2,
  };
}

/** The home page is a short, failure-safe queue; its source pages remain authoritative. */
export function StudentToday({ accountKey }: { accountKey: string }) {
  const plans = apiClient.useQuery<unknown>({
    key: ["learning-plans", "today", accountKey],
    url: "v2/learning-plans/me/plans",
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const mocks = apiClient.useQuery<unknown>({
    key: ["mock-assignments", "today", accountKey],
    url: "v2/mock-assignments/me?page=1&limit=25",
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const humans = apiClient.useQuery<unknown>({
    key: ["human-interviews", "today", accountKey],
    url: "v2/human-interviews/me?page=1",
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const assessments = apiClient.useQuery<unknown>({
    key: [ENDPOINTS.INTERVIEWS.WITH_SUMMARY, "today", accountKey],
    url: `${ENDPOINTS.INTERVIEWS.WITH_SUMMARY}?limit=20`,
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const actions: Action[] = [];
  const humanData =
    humans.isError || humans.isFetching ? null : parseHumanInterviewsPage(humans.data);
  const nextHuman = humanData?.items
    .filter((item) => item.status === "scheduled" || item.status === "rescheduled")
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  if (nextHuman)
    actions.push({
      title: nextHuman.canJoin
        ? "Join your Human Interview"
        : `Human Interview: ${nextHuman.roundName || nextHuman.title}`,
      detail: nextHuman.canJoin
        ? "Your verified meeting access is open."
        : `Scheduled ${new Date(nextHuman.startsAt).toLocaleString()}.`,
      href: "/human-interviews",
      priority: nextHuman.canJoin ? 1 : 3,
    });
  const planData = plans.isError || plans.isFetching ? null : parseLearningPlanPage(plans.data);
  const plan = planData?.items.find((item) => item.status === "active");
  const step = plan?.steps.find((item) => item.status === "current");
  if (plan && step) {
    const href =
      step.kind === "drill" && step.module
        ? `${drillHref(step.module)}?planAssignment=${plan.id}&planStep=${step.id}`
        : step.kind === "mock" && step.jobProfileId
          ? `/interview-start?mode=practice&jobProfileId=${step.jobProfileId}&courseId=${encodeURIComponent(plan.courseId)}`
          : "/coaching";
    actions.push({
      title: plan.plan.title,
      detail: `Learning Plan · Step ${step.position}: ${step.title}`,
      href,
      priority: 4,
    });
  }
  const mockData = mocks.isError || mocks.isFetching ? null : parseMockAssignments(mocks.data);
  const mock = mockData?.items.find((item) => item.status === "assigned");
  if (mock)
    actions.push({
      title: `Assigned Mock Interview: ${mock.jobName}`,
      detail: mock.dueDate
        ? `Due ${new Date(mock.dueDate).toLocaleDateString()}.`
        : "Assigned by your program team.",
      href: `/interview-start?mode=practice&jobProfileId=${mock.jobProfileId}&courseId=${encodeURIComponent(mock.courseId)}`,
      priority: 5,
    });
  const assessment =
    assessments.isError || assessments.isFetching ? null : assessmentAction(assessments.data);
  if (assessment) actions.push(assessment);
  const next = actions.sort((a, b) => a.priority - b.priority)[0];
  const loading = [plans, mocks, humans, assessments].some(
    (query) => query.isLoading || query.isFetching
  );
  return (
    <section className="ws-today" aria-labelledby="today-title">
      <div>
        <p className="studio-eyebrow">Today</p>
        <h2 id="today-title">Your next action</h2>
      </div>
      {loading && !next ? (
        <output>Checking your assigned work…</output>
      ) : next ? (
        <Link className="ws-today-action" href={next.href}>
          <span>
            <strong>{next.title}</strong>
            <small>{next.detail}</small>
          </span>
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      ) : (
        <div className="ws-today-empty">
          <p>Nothing needs your attention right now.</p>
          <Link href="/coaching">Choose a Coaching activity</Link>
        </div>
      )}
      <p className="ws-today-note">
        This list only uses work that Samvaad Saathi can verify. Open the relevant page for all
        details.
      </p>
    </section>
  );
}
