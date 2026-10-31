import { expect, it } from "vitest";
import {
  HUMAN_INTERVIEW_PAGE_SIZE,
  parseHumanInterviewsPage,
  verifiedGoogleMeetUrl,
} from "@/lib/human-interviews";

const appointment = {
  id: 42,
  title: "Engineering conversation",
  starts_at: "2026-11-05T09:00:00Z",
  ends_at: "2026-11-05T09:45:00Z",
  join_opens_at: "2026-11-05T08:45:00Z",
  status: "scheduled",
  can_join: true,
  outcome_source: null,
};

it("accepts a bounded, coherent Human Interview appointment response", () => {
  expect(parseHumanInterviewsPage({ items: [appointment], total: 1, notice: "" })).toMatchObject({
    total: 1,
    items: [{ id: 42, canJoin: true, meetingPlatform: "Google Meet" }],
  });
});

it.each([
  ["invalid schedule", { ...appointment, ends_at: appointment.starts_at }],
  ["unknown status", { ...appointment, status: "in_progress" }],
  ["untrusted platform", { ...appointment, meeting_platform: "Zoom" }],
  ["unbounded instructions", { ...appointment, instructions: "x".repeat(2_001) }],
])("rejects a %s rather than guessing meeting access", (_name, row) => {
  expect(parseHumanInterviewsPage({ items: [row], total: 1, notice: "" })).toBeNull();
});

it("caps an unexpected response page instead of rendering an unbounded student list", () => {
  expect(
    parseHumanInterviewsPage({
      items: Array.from({ length: HUMAN_INTERVIEW_PAGE_SIZE + 1 }, (_, id) => ({
        ...appointment,
        id: id + 1,
      })),
      total: HUMAN_INTERVIEW_PAGE_SIZE + 1,
      notice: "",
    })
  ).toBeNull();
});

it("never exposes join access from an appointment status that cannot be joined", () => {
  expect(
    parseHumanInterviewsPage({
      items: [{ ...appointment, status: "cancelled", can_join: true }],
      total: 1,
      notice: "",
    })?.items[0]?.canJoin
  ).toBe(false);
});

it.each([
  ["https://meet.google.com/abc-defg-hij", "https://meet.google.com/abc-defg-hij"],
  ["https://evil.example/meeting", null],
  ["javascript:alert(1)", null],
  ["https://meet.google.com/ABC-defg-hij", null],
])("accepts only the supported verified meeting URL", (url, expected) => {
  expect(verifiedGoogleMeetUrl({ url })).toBe(expected);
});
