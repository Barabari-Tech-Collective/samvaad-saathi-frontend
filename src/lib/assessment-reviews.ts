export const ASSESSMENT_REVIEW_PAGE_SIZE = 20;
const MAX_HISTORY_EVENTS = 50;
const MAX_SIGNALS_PER_EVENT = 50;

export interface AssessmentReviewSignal {
  eventId: string;
  reason: string;
  recordedAt: string;
}

export interface AssessmentReviewEvent {
  kind: string;
  reason: string;
  at: string;
  source: string | null;
  outcome: string | null;
  signals: AssessmentReviewSignal[] | null;
}

export interface AssessmentReviewCase {
  id: number;
  interviewId: number;
  state: string;
  outcome: string | null;
  version: number;
  appealDeadline: string | null;
  canExplain: boolean;
  canAppeal: boolean;
  history: AssessmentReviewEvent[];
}

export interface AssessmentReviewsPage {
  items: AssessmentReviewCase[];
  total: number;
  notice: string;
}

const text = (value: unknown, maximum: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
};

const optionalText = (value: unknown, maximum: number): string | null | undefined => {
  if (value === undefined || value === null) return null;
  return text(value, maximum) ?? undefined;
};

const timestamp = (value: unknown): string | null =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;

/**
 * Assessment reviews can contain sensitive evidence. Reject malformed or unexpectedly large
 * responses instead of rendering stale, partial, or fabricated review state.
 */
export function parseAssessmentReviewsPage(value: unknown): AssessmentReviewsPage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Record<string, unknown>;
  if (
    !Array.isArray(page.items) ||
    page.items.length > ASSESSMENT_REVIEW_PAGE_SIZE ||
    !Number.isSafeInteger(page.total) ||
    (page.total as number) < 0 ||
    (page.total as number) < page.items.length
  )
    return null;
  const notice =
    page.notice === undefined
      ? ""
      : typeof page.notice === "string" && page.notice.length <= 500
        ? page.notice.trim()
        : null;
  if (notice === null) return null;

  const items: AssessmentReviewCase[] = [];
  for (const value of page.items) {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const id = row.id;
    const interviewId = row.interview_id;
    const state = text(row.state, 80);
    const outcome = optionalText(row.outcome, 120);
    const deadline = row.appeal_deadline === null ? null : timestamp(row.appeal_deadline);
    if (
      !Number.isSafeInteger(id) ||
      (id as number) <= 0 ||
      !Number.isSafeInteger(interviewId) ||
      (interviewId as number) <= 0 ||
      !state ||
      outcome === undefined ||
      (deadline === null && row.appeal_deadline !== null) ||
      !Number.isSafeInteger(row.version) ||
      (row.version as number) < 0 ||
      typeof row.can_explain !== "boolean" ||
      typeof row.can_appeal !== "boolean" ||
      !Array.isArray(row.history) ||
      row.history.length > MAX_HISTORY_EVENTS
    )
      return null;

    const history: AssessmentReviewEvent[] = [];
    for (const value of row.history) {
      if (!value || typeof value !== "object") return null;
      const event = value as Record<string, unknown>;
      const kind = text(event.kind, 80);
      const reason = text(event.reason, 2_000);
      const at = timestamp(event.at);
      const source = optionalText(event.source, 100);
      const eventOutcome = optionalText(event.outcome, 120);
      if (!kind || !reason || !at || source === undefined || eventOutcome === undefined)
        return null;
      let signals: AssessmentReviewSignal[] | null = null;
      if (event.signals !== undefined && event.signals !== null) {
        if (!Array.isArray(event.signals) || event.signals.length > MAX_SIGNALS_PER_EVENT)
          return null;
        signals = [];
        for (const value of event.signals) {
          if (!value || typeof value !== "object") return null;
          const signal = value as Record<string, unknown>;
          const eventId = text(signal.eventId, 160);
          const signalReason = text(signal.reason, 500);
          const recordedAt = timestamp(signal.recordedAt);
          if (!eventId || !signalReason || !recordedAt) return null;
          signals.push({ eventId, reason: signalReason, recordedAt });
        }
      }
      history.push({ kind, reason, at, source, outcome: eventOutcome, signals });
    }
    items.push({
      id: id as number,
      interviewId: interviewId as number,
      state,
      outcome,
      version: row.version as number,
      appealDeadline: deadline,
      canExplain: row.can_explain,
      canAppeal: row.can_appeal,
      history,
    });
  }
  return { items, total: page.total as number, notice };
}

export function validReviewReason(value: string): string | null {
  const reason = value.trim();
  return reason.length >= 10 && reason.length <= 2_000 ? reason : null;
}
