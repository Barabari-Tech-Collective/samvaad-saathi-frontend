export interface LearningPlanStepContext {
  assignmentId: number;
  stepId: number;
  /** A drill set directly by a teacher, not a step inside a plan. */
  coaching?: boolean;
}

const positiveId = (value: string | null): number | null =>
  value && /^[1-9]\d{0,14}$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : null;

export function learningPlanStepContext(
  params: Pick<URLSearchParams, "get">
): LearningPlanStepContext | null {
  const coaching = positiveId(params.get("coachingAssignment"));
  if (coaching) return { assignmentId: coaching, stepId: 0, coaching: true };
  const assignmentId = positiveId(params.get("planAssignment"));
  const stepId = positiveId(params.get("planStep"));
  return assignmentId && stepId ? { assignmentId, stepId } : null;
}

export function learningPlanStepQuery(context: LearningPlanStepContext | null): string {
  if (context?.coaching) return `&coachingAssignment=${context.assignmentId}`;
  return context ? `&planAssignment=${context.assignmentId}&planStep=${context.stepId}` : "";
}

export function drillSessionUrl(context: LearningPlanStepContext | null): string {
  if (context?.coaching) return `v2/coaching-assignments/me/${context.assignmentId}/drill-session`;
  return context
    ? `v2/learning-plans/me/${context.assignmentId}/steps/${context.stepId}/drill-session`
    : "v2/learning-plans/me/invalid/steps/invalid/drill-session";
}
