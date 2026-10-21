export type HistoryGroup = "incomplete" | "completed" | "closed";
export interface HistoryItem {
  interviewId: number;
  track: string;
  difficulty: string;
  status: string;
  createdAt: string;
  interviewMode?: "practice" | "assessment" | null;
  expiresAt?: string | null;
  summaryReportAvailable?: boolean;
  knowledgePercentage?: number | null;
  speechFluencyPercentage?: number | null;
}
export interface HistoryPage {
  items: HistoryItem[];
  nextCursor: number | null;
  limit: number;
}
export function validInterviewId(value: string | null): value is string {
  return !!value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}
export function historyGroup(item: HistoryItem): HistoryGroup {
  if (["active", "paused", "preparing", "in_progress"].includes(item.status)) return "incomplete";
  return item.status === "completed" ? "completed" : "closed";
}
export function historyTab(value: string | null): HistoryGroup {
  return value === "completed" || value === "closed" ? value : "incomplete";
}
export function parseHistoryPage(value: unknown, cursor: number | null): HistoryPage {
  const page = value as HistoryPage | undefined;
  const id = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n > 0;
  const instant = (s: unknown) => typeof s === "string" && Number.isFinite(Date.parse(s));
  const text = (s: unknown) => typeof s === "string" && s.trim().length > 0;
  if (
    !page ||
    !Array.isArray(page.items) ||
    !id(page.limit) ||
    page.limit > 100 ||
    page.items.length > page.limit ||
    !(page.nextCursor === null || id(page.nextCursor))
  )
    throw new Error("History response is incomplete. Retry loading it.");
  if (
    page.items.some(
      (item) =>
        !item ||
        !id(item.interviewId) ||
        !text(item.track) ||
        !text(item.difficulty) ||
        !text(item.status) ||
        !instant(item.createdAt) ||
        !(item.expiresAt == null || instant(item.expiresAt)) ||
        !(item.interviewMode == null || ["practice", "assessment"].includes(item.interviewMode))
    )
  )
    throw new Error("History details could not be verified. Retry loading them.");
  if (
    page.nextCursor !== null &&
    (!page.items.length ||
      (cursor !== null && page.nextCursor >= cursor) ||
      page.nextCursor > Math.min(...page.items.map((item) => item.interviewId)))
  )
    throw new Error("Older history did not advance. Refresh history before loading more.");
  return page;
}
export function mergeHistory(pages: HistoryPage[]): HistoryItem[] {
  const rows = new Map<number, HistoryItem>();
  for (const page of pages) for (const item of page.items) rows.set(item.interviewId, item);
  return [...rows.values()].sort((a, b) => b.interviewId - a.interviewId);
}
export function historyResumeHref(item: HistoryItem, now: number): string | null {
  if (
    historyGroup(item) !== "incomplete" ||
    !["active", "paused"].includes(item.status) ||
    !item.interviewMode ||
    (item.status === "paused" && item.interviewMode === "assessment") ||
    (item.expiresAt && Date.parse(item.expiresAt) <= now)
  )
    return null;
  return `/interview?${new URLSearchParams({ interviewId: String(item.interviewId), resumed: "true", interviewMode: item.interviewMode })}`;
}
export function historyScore(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? `${Math.round(value)}%`
    : "Not available";
}
export function responseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("response" in error)) return undefined;
  const response = error.response;
  return response &&
    typeof response === "object" &&
    "status" in response &&
    typeof response.status === "number"
    ? response.status
    : undefined;
}
