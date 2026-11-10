// One way to show dates to learners: short, friendly and in Indian time.

const DAY = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});
const parts = (value: Date) => {
  const p = Object.fromEntries(DAY.formatToParts(value).map((x) => [x.type, x.value]));
  return `${p.weekday}, ${p.day} ${p.month}`;
};
/** A date-only value has no time zone of its own, so read it as midday. */
const read = (value: string) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+05:30` : value);

export function friendlyDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = read(value);
  return Number.isNaN(date.getTime()) ? "" : parts(date);
}

/** "Due Fri, 14 Nov", or nothing when there is no due date. */
export function dueText(value: string | null | undefined): string {
  const date = friendlyDate(value);
  return date ? `Due ${date}` : "";
}

const WORDS: Record<string, string> = {
  assigned: "To do",
  active: "In progress",
  paused: "Paused",
  preparing: "Getting ready",
  completed: "Finished",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
  expired: "Time ended",
  failed: "Could not finish",
  terminated: "Stopped",
  rescheduled: "New time set",
  no_show: "Missed",
  in_progress: "In progress",
};
/** A status word a person would say. Unknown values are shown without underscores. */
export const statusWord = (value: string) => WORDS[value] ?? value.replaceAll("_", " ");

/** "Fri, 14 Nov, 4:30 pm" in India time, so a learner never has to convert anything. */
export function friendlyDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
}
