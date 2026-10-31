export const MOCK_ASSIGNMENT_PAGE_SIZE = 25;
export interface MockAssignment {
  id: number;
  courseId: string;
  jobProfileId: number;
  jobName: string;
  reason: string;
  note: string | null;
  dueDate: string | null;
  status: "assigned" | "completed" | "cancelled";
  version: number;
  interviewId: number | null;
  createdAt: string;
  closedAt: string | null;
}
export interface MockAssignmentPage {
  items: MockAssignment[];
  total: number;
  page: number;
  limit: number;
  notice: string;
}
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;
const date = (v: unknown): string | null | undefined =>
  v === null ? null : typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : undefined;
export function parseMockAssignments(value: unknown): MockAssignmentPage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Record<string, unknown>;
  if (
    !Array.isArray(page.items) ||
    page.items.length > MOCK_ASSIGNMENT_PAGE_SIZE ||
    !Number.isSafeInteger(page.total) ||
    !Number.isSafeInteger(page.page) ||
    !Number.isSafeInteger(page.limit) ||
    (page.total as number) < page.items.length ||
    (page.page as number) < 1 ||
    page.limit !== MOCK_ASSIGNMENT_PAGE_SIZE ||
    typeof page.notice !== "string" ||
    page.notice.length > 500
  )
    return null;
  const items: MockAssignment[] = [];
  for (const value of page.items) {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const id = row.id;
    const courseId = text(row.course_id, 128);
    const jobProfileId = row.job_profile_id;
    const jobName = text(row.job_name, 200);
    const reason = text(row.reason, 1_000);
    const note = row.note === null ? null : text(row.note, 2_000);
    const dueDate = date(row.due_date);
    const createdAt = date(row.created_at);
    const closedAt = date(row.closed_at);
    const status = row.status;
    if (
      !Number.isSafeInteger(id) ||
      (id as number) < 1 ||
      !courseId ||
      !Number.isSafeInteger(jobProfileId) ||
      (jobProfileId as number) < 1 ||
      !jobName ||
      !reason ||
      (note === null && row.note !== null) ||
      dueDate === undefined ||
      !createdAt ||
      closedAt === undefined ||
      !Number.isSafeInteger(row.version) ||
      (row.version as number) < 1 ||
      !["assigned", "completed", "cancelled"].includes(status as string) ||
      !(
        row.interview_id === null ||
        (Number.isSafeInteger(row.interview_id) && (row.interview_id as number) > 0)
      )
    )
      return null;
    items.push({
      id: id as number,
      courseId,
      jobProfileId: jobProfileId as number,
      jobName,
      reason,
      note,
      dueDate,
      status: status as MockAssignment["status"],
      version: row.version as number,
      interviewId: row.interview_id as number | null,
      createdAt,
      closedAt,
    });
  }
  return new Set(items.map((item) => item.id)).size === items.length
    ? {
        items,
        total: page.total as number,
        page: page.page as number,
        limit: page.limit as number,
        notice: page.notice.trim(),
      }
    : null;
}
