"use client";

import { dueText } from "@/lib/dates";
import Link from "next/link";
import { useRef, useState } from "react";
import { apiClient } from "@/lib/api-config";
import {
  drillHref,
  parseLearningPlanPage,
  validReflection,
  type LearningPlanAssignment,
  type LearningPlanStep,
} from "@/lib/learning-plans";

const newKey = (): string | null =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : null;

function CurrentStep({
  assignment,
  step,
  refresh,
}: {
  assignment: LearningPlanAssignment;
  step: LearningPlanStep;
  refresh: () => void;
}) {
  const [reflection, setReflection] = useState("");
  const [error, setError] = useState("");
  const submit = apiClient.useMutation<unknown, { text: string }>({
    url: `v2/learning-plans/me/${assignment.id}/steps/${step.id}/reflection`,
    method: "post",
    showToastError: false,
    options: { retry: false },
  });
  if (step.kind === "drill" && step.module)
    return (
      <Link
        className="ws-button"
        href={`${drillHref(step.module)}?planAssignment=${assignment.id}&planStep=${step.id}`}
      >
        Start {step.moduleLabel ?? step.title}
      </Link>
    );
  if (step.kind === "mock")
    return (
      <Link
        className="ws-button"
        href={`/interview-start?mode=practice&jobProfileId=${step.jobProfileId}&courseId=${encodeURIComponent(assignment.courseId)}`}
      >
        Start {step.jobName ?? "assigned mock"}
      </Link>
    );
  return (
    <div className="space-y-2">
      <label className="block font-medium" htmlFor={`reflection-${assignment.id}-${step.id}`}>
        Your reflection
      </label>
      <textarea
        id={`reflection-${assignment.id}-${step.id}`}
        value={reflection}
        maxLength={2_000}
        rows={4}
        className="w-full rounded-xl border p-3"
        onChange={(event) => setReflection(event.target.value)}
      />
      <p className="text-sm text-gray-600">
        At least 20 characters. {reflection.trim().length}/2000
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        className="ws-button"
        disabled={submit.isPending}
        onClick={async () => {
          const text = validReflection(reflection);
          if (!text) return setError("Write at least 20 characters before saving your reflection.");
          setError("");
          try {
            await submit.mutateAsync({ text });
            setReflection("");
            refresh();
          } catch {
            setError(
              "Your reflection was not saved. Check the plan is still active, then try again."
            );
          }
        }}
      >
        {submit.isPending ? "Saving reflection…" : "Save reflection"}
      </button>
    </div>
  );
}

function PlanCard({
  assignment,
  refresh,
}: {
  assignment: LearningPlanAssignment;
  refresh: () => void;
}) {
  const current = assignment.steps.find((step) => step.status === "current");
  return (
    <li className="space-y-3 rounded-2xl border border-[#DEE8FB] p-4">
      <div>
        <h3 className="text-lg font-semibold">{assignment.plan.title}</h3>
        <p>{assignment.plan.goal}</p>
      </div>
      <p className="text-sm">
        {assignment.completedSteps} of {assignment.totalSteps} steps complete ·{" "}
        {assignment.source === "assigned" ? "Assigned by your teacher" : "Started by you"}
      </p>
      {assignment.reason && <p className="text-sm text-gray-600">{assignment.reason}</p>}
      {assignment.dueDate && (
        <p className="text-sm">{dueText(assignment.dueDate)}</p>
      )}
      {assignment.status === "active" && current ? (
        <section className="rounded-xl bg-[#F5F7FF] p-3">
          <p className="font-medium">Current step: {current.title}</p>
          {current.instructions && <p className="mt-1 text-sm">{current.instructions}</p>}
          <div className="mt-3">
            <CurrentStep assignment={assignment} step={current} refresh={refresh} />
          </div>
        </section>
      ) : (
        <p className="font-medium">
          {assignment.status === "completed" ? "Plan completed" : "This plan is no longer active"}
        </p>
      )}
    </li>
  );
}

export function LearningPlans({ accountKey }: { accountKey: string }) {
  const [startError, setStartError] = useState("");
  const keys = useRef(new Map<string, string>());
  const assigned = apiClient.useQuery<unknown>({
    url: "v2/learning-plans/me/plans",
    key: ["learning-plans", accountKey],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: false },
  });
  const available = apiClient.useQuery<unknown>({
    url: "v2/learning-plans/me/available",
    key: ["available-learning-plans", accountKey],
    options: { staleTime: 30_000, gcTime: 0, retry: false, refetchOnWindowFocus: false },
  });
  const start = apiClient.useMutation<
    unknown,
    { request_key: string; plan_id: number; course_id: string }
  >({
    url: "v2/learning-plans/me/start",
    method: "post",
    showToastError: false,
    options: { retry: false },
  });
  const plans =
    assigned.isError || assigned.isFetching ? null : parseLearningPlanPage(assigned.data);
  const choices =
    available.isError || available.isFetching ? null : parseLearningPlanPage(available.data, false);
  const refresh = () => {
    void assigned.refetch();
    void available.refetch();
  };
  // Hide the whole block when there is nothing to do here.
  if (
    !assigned.isError &&
    !available.isError &&
    (!plans || !plans.items.length) &&
    (!choices || !choices.items.length)
  )
    return null;
  return (
    <section className="studio-panel space-y-4" aria-label="Learning Plans">
      <h3 className="text-lg font-semibold text-[#1F285B]">Learning Plans</h3>
      <p className="text-sm text-gray-600">One step at a time. Your progress updates when you finish each step.</p>
      {assigned.isError || (assigned.data && !plans) ? (
        <div role="alert">
          <p>We couldn&apos;t load your plans. Your progress is safe.</p>
          <button className="ws-button mt-2" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : plans && plans.items.length > 0 ? (
        <ul className="space-y-3">
          {plans.items.map((plan) => (
            <PlanCard key={plan.id} assignment={plan} refresh={refresh} />
          ))}
        </ul>
      ) : null}
      <div className="border-t pt-4">
        <h4 className="font-semibold">Plans you can start</h4>
        {startError && <p role="alert">{startError}</p>}
        {available.isError || (available.data && !choices) ? (
          <p>We couldn&apos;t load more plans.</p>
        ) : !choices ? (
          <output aria-label="Loading" className="ws-next-loading"><span /><span /><span /></output>
        ) : !choices.items.length ? (
          <p className="text-sm text-gray-600">No other plans right now.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {choices.items.map((plan) => (
              <li key={plan.id} className="rounded-xl border p-3">
                <p className="font-medium">{plan.plan.title}</p>
                <p className="text-sm">{plan.plan.goal}</p>
                <button
                  className="ws-button mt-3"
                  disabled={start.isPending}
                  onClick={async () => {
                    const mapKey = `${plan.plan.id}:${plan.courseId}`;
                    const requestKey = keys.current.get(mapKey) ?? newKey();
                    if (!requestKey)
                      return setStartError(
                        "Please update your browser and try again."
                      );
                    keys.current.set(mapKey, requestKey);
                    setStartError("");
                    try {
                      const response = await start.mutateAsync({
                        request_key: requestKey,
                        plan_id: plan.plan.id,
                        course_id: plan.courseId,
                      });
                      if (!parseLearningPlanPage({ items: [response] })) throw new Error();
                      refresh();
                    } catch {
                      setStartError(
                        "We could not confirm that plan started. Try again; the same request will not create a duplicate plan."
                      );
                    }
                  }}
                >
                  {" "}
                  {start.isPending ? "Starting plan…" : "Start plan"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
