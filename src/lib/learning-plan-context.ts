export interface LearningPlanStepContext {
  assignmentId: number;
  stepId: number;
}

const positiveId = (value: string | null): number | null =>
  value && /^[1-9]\d{0,14}$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : null;

export function learningPlanStepContext(
  params: Pick<URLSearchParams, "get">
): LearningPlanStepContext | null {
  const assignmentId = positiveId(params.get("planAssignment"));
  const stepId = positiveId(params.get("planStep"));
  return assignmentId && stepId ? { assignmentId, stepId } : null;
}

export function learningPlanStepQuery(context: LearningPlanStepContext | null): string {
  return context ? `&planAssignment=${context.assignmentId}&planStep=${context.stepId}` : "";
}
