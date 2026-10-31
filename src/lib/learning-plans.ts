export const LEARNING_PLAN_PAGE_SIZE = 50;

export type LearningPlanStepKind = "drill" | "mock" | "reflection";
export type LearningPlanStepStatus = "done" | "current" | "upcoming";

export interface LearningPlanStep {
  id: number;
  position: number;
  kind: LearningPlanStepKind;
  title: string;
  instructions: string | null;
  module: "warm_up" | "think_fast" | "pronunciation" | "structure" | "pace" | null;
  moduleLabel: string | null;
  jobProfileId: number | null;
  jobName: string | null;
  status: LearningPlanStepStatus | null;
  completedAt: string | null;
  reflection: string | null;
}

export interface LearningPlanAssignment {
  id: number;
  courseId: string;
  source: "assigned" | "self";
  status: "active" | "completed" | "cancelled";
  version: number;
  reason: string;
  dueDate: string | null;
  createdAt: string;
  closedAt: string | null;
  plan: { id: number; title: string; goal: string; version: number };
  completedSteps: number;
  totalSteps: number;
  steps: LearningPlanStep[];
}

export interface LearningPlanPage {
  items: LearningPlanAssignment[];
}

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : null;
const optionalText = (value: unknown, max: number): string | null | undefined =>
  value === null ? null : value === undefined ? null : (text(value, max) ?? undefined);
const id = (value: unknown): number | null =>
  Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : null;
const date = (value: unknown): string | null | undefined =>
  value === null
    ? null
    : typeof value === "string" && Number.isFinite(Date.parse(value))
      ? value
      : undefined;

function parseStep(value: unknown, assigned: boolean): LearningPlanStep | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const stepId = id(row.id);
  const position = id(row.position);
  const kind = row.kind;
  const title = text(row.title, 200);
  const instructions = optionalText(row.instructions, 2_000);
  const module = row.module;
  const moduleLabel = optionalText(row.module_label, 100);
  const jobProfileId = row.job_profile_id === null ? null : id(row.job_profile_id);
  const jobName = optionalText(row.job_name, 200);
  const status = assigned ? row.status : null;
  const completedAt = assigned ? date(row.completed_at) : null;
  const reflection = assigned ? optionalText(row.reflection, 2_000) : null;
  const validStatus = status === "done" || status === "current" || status === "upcoming";
  const validModule = ["warm_up", "think_fast", "pronunciation", "structure", "pace"].includes(
    module as string
  );
  if (
    !stepId ||
    !position ||
    !title ||
    instructions === undefined ||
    moduleLabel === undefined ||
    jobName === undefined ||
    completedAt === undefined ||
    reflection === undefined ||
    (assigned && !validStatus) ||
    (kind !== "drill" && kind !== "mock" && kind !== "reflection") ||
    (kind === "drill" && (!validModule || jobProfileId !== null || jobName !== null)) ||
    (kind === "mock" && (!jobProfileId || !jobName || module !== null)) ||
    (kind === "reflection" && (module !== null || jobProfileId !== null || jobName !== null))
  )
    return null;
  return {
    id: stepId,
    position,
    kind,
    title,
    instructions,
    module: kind === "drill" ? (module as LearningPlanStep["module"]) : null,
    moduleLabel,
    jobProfileId,
    jobName,
    status: assigned ? (status as LearningPlanStepStatus) : null,
    completedAt,
    reflection,
  };
}

function parseAssignment(value: unknown, assigned: boolean): LearningPlanAssignment | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const assignmentId = id(row.id);
  const courseId = text(row.course_id, 160);
  const source = assigned ? row.source : "self";
  const status = assigned ? row.status : "active";
  const reason = assigned ? text(row.reason, 2_000) : "Available to start yourself.";
  const dueDate = assigned ? date(row.due_date) : null;
  const createdAt = assigned ? date(row.created_at) : "1970-01-01T00:00:00Z";
  const closedAt = assigned ? date(row.closed_at) : null;
  const plan = row.plan as Record<string, unknown> | null;
  if (
    !assignmentId ||
    !courseId ||
    !reason ||
    dueDate === undefined ||
    !createdAt ||
    closedAt === undefined ||
    (source !== "assigned" && source !== "self") ||
    (status !== "active" && status !== "completed" && status !== "cancelled") ||
    (assigned && (!Number.isSafeInteger(row.version) || (row.version as number) < 1)) ||
    !plan ||
    !id(plan.id) ||
    !text(plan.title, 200) ||
    !text(plan.goal, 2_000) ||
    !Number.isSafeInteger(plan.version) ||
    (plan.version as number) < 1 ||
    !Array.isArray(row.steps) ||
    row.steps.length === 0 ||
    row.steps.length > 20
  )
    return null;
  const steps = row.steps.map((step) => parseStep(step, assigned));
  if (steps.some((step) => !step) || steps.some((step, index) => step!.position !== index + 1))
    return null;
  const completedSteps: unknown = assigned ? row.completed_steps : 0;
  const totalSteps: unknown = assigned ? row.total_steps : steps.length;
  if (
    !Number.isSafeInteger(completedSteps) ||
    !Number.isSafeInteger(totalSteps) ||
    (completedSteps as number) < 0 ||
    (totalSteps as number) !== steps.length ||
    (completedSteps as number) > (totalSteps as number)
  )
    return null;
  if (
    assigned &&
    status === "active" &&
    steps.filter((step) => step!.status === "current").length !== 1
  )
    return null;
  return {
    id: assignmentId,
    courseId,
    source,
    status,
    version: assigned ? (row.version as number) : (plan.version as number),
    reason,
    dueDate,
    createdAt,
    closedAt,
    plan: {
      id: id(plan.id)!,
      title: text(plan.title, 200)!,
      goal: text(plan.goal, 2_000)!,
      version: plan.version as number,
    },
    completedSteps: completedSteps as number,
    totalSteps: totalSteps as number,
    steps: steps as LearningPlanStep[],
  };
}

export function parseLearningPlanPage(value: unknown, assigned = true): LearningPlanPage | null {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as Record<string, unknown>).items)
  )
    return null;
  const rows = (value as { items: unknown[] }).items;
  if (rows.length > LEARNING_PLAN_PAGE_SIZE) return null;
  const items = rows.map((row) => parseAssignment(row, assigned));
  return items.some((item) => !item) || new Set(items.map((item) => item!.id)).size !== items.length
    ? null
    : { items: items as LearningPlanAssignment[] };
}

export function validReflection(value: string): string | null {
  const text = value.trim();
  return text.length >= 20 && text.length <= 2_000 ? text : null;
}

export const drillHref = (module: NonNullable<LearningPlanStep["module"]>): string =>
  ({
    warm_up: "/warm-up-chat",
    think_fast: "/think-fast",
    pronunciation: "/pronunciation-practice",
    structure: "/structure-your-answer",
    pace: "/control-your-pace",
  })[module];
