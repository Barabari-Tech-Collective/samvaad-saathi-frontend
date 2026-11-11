export const HUMAN_INTERVIEW_PAGE_SIZE = 20;

const APPOINTMENT_STATUSES = [
  "scheduled",
  "rescheduled",
  "cancelled",
  "awaiting_outcome",
  "completed",
  "no_show",
  "technical_issue",
] as const;

export type HumanInterviewStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface HumanInterviewAppointment {
  id: number;
  title: string;
  opportunityTitle: string | null;
  roundName: string | null;
  startsAt: string;
  endsAt: string;
  joinOpensAt: string;
  timezone: string | null;
  durationMinutes: number | null;
  interviewerName: string | null;
  meetingPlatform: "Google Meet";
  instructions: string | null;
  status: HumanInterviewStatus;
  canJoin: boolean;
  outcomeSource: string | null;
  /** The host's result and written feedback, present only once the host has released them. */
  result: HumanInterviewResult | null;
  feedback: string | null;
}

const RESULTS = ["selected", "next_round", "on_hold", "not_selected"] as const;
export type HumanInterviewResult = (typeof RESULTS)[number];
export const RESULT_WORDS: Record<HumanInterviewResult, string> = {
  selected: "Selected",
  next_round: "You move to the next round",
  on_hold: "On hold",
  not_selected: "Not selected this time",
};

export interface HumanInterviewsPage {
  items: HumanInterviewAppointment[];
  total: number;
  notice: string;
}

const text = (value: unknown, maximum: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
};

const optionalText = (value: unknown, maximum: number): string | null | undefined => {
  if (value === null || value === undefined) return null;
  return text(value, maximum) ?? undefined;
};

const date = (value: unknown): string | null =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;

const timezone = (value: unknown): string | null | undefined => {
  if (value === null || value === undefined) return null;
  const name = text(value, 100);
  if (!name) return undefined;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: name }).format();
    return name;
  } catch {
    return undefined;
  }
};

/**
 * A student must never act on a loosely-shaped appointment object. Reject the full response on
 * malformed data rather than guessing a status, date, or meeting authority.
 */
export function parseHumanInterviewsPage(value: unknown): HumanInterviewsPage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Record<string, unknown>;
  if (
    !Array.isArray(page.items) ||
    page.items.length > HUMAN_INTERVIEW_PAGE_SIZE ||
    !Number.isSafeInteger(page.total) ||
    (page.total as number) < page.items.length ||
    (page.total as number) < 0
  )
    return null;
  const notice =
    page.notice === undefined
      ? ""
      : typeof page.notice === "string" && page.notice.length <= 500
        ? page.notice.trim()
        : null;
  if (notice === null) return null;
  const items: HumanInterviewAppointment[] = [];
  for (const value of page.items) {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const id = row.id;
    const title = text(row.title, 200);
    const startsAt = date(row.starts_at);
    const endsAt = date(row.ends_at);
    const joinOpensAt = date(row.join_opens_at);
    const status = row.status;
    const opportunityTitle = optionalText(row.opportunity_title, 200);
    const roundName = optionalText(row.round_name, 200);
    const interviewerName = optionalText(row.interviewer_name, 160);
    const instructions = optionalText(row.instructions, 2_000);
    const zone = timezone(row.timezone);
    const source = optionalText(row.outcome_source, 100);
    const platform = row.meeting_platform;
    const minutes = row.duration_minutes;
    // An unknown result is shown as no result rather than hiding the whole list.
    const result =
      row.result_released === true && RESULTS.includes(row.result as HumanInterviewResult)
        ? (row.result as HumanInterviewResult)
        : null;
    const feedback = row.result_released === true ? text(row.feedback, 4_000) : null;
    if (
      !Number.isSafeInteger(id) ||
      (id as number) <= 0 ||
      !title ||
      !startsAt ||
      !endsAt ||
      !joinOpensAt ||
      Date.parse(joinOpensAt) > Date.parse(endsAt) ||
      Date.parse(startsAt) >= Date.parse(endsAt) ||
      typeof status !== "string" ||
      !APPOINTMENT_STATUSES.includes(status as HumanInterviewStatus) ||
      opportunityTitle === undefined ||
      roundName === undefined ||
      interviewerName === undefined ||
      instructions === undefined ||
      zone === undefined ||
      source === undefined ||
      (platform !== undefined && platform !== null && platform !== "Google Meet") ||
      (minutes !== undefined &&
        minutes !== null &&
        (!Number.isSafeInteger(minutes) ||
          (minutes as number) <= 0 ||
          (minutes as number) > 480)) ||
      typeof row.can_join !== "boolean"
    )
      return null;
    items.push({
      id: id as number,
      title,
      opportunityTitle,
      roundName,
      startsAt,
      endsAt,
      joinOpensAt,
      timezone: zone,
      durationMinutes: typeof minutes === "number" ? minutes : null,
      interviewerName,
      instructions,
      meetingPlatform: "Google Meet",
      status: status as HumanInterviewStatus,
      canJoin: row.can_join && (status === "scheduled" || status === "rescheduled"),
      outcomeSource: source,
      result,
      feedback,
    });
  }
  return { items, total: page.total as number, notice };
}

/** Only the currently supported provider URL is accepted from the protected join endpoint. */
export function verifiedGoogleMeetUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const url = (value as Record<string, unknown>).url;
  return typeof url === "string" &&
    url.length <= 256 &&
    /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url)
    ? url
    : null;
}
