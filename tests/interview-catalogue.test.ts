import { expect, it } from "vitest";
import { INTERVIEW_CATALOGUE_PAGE_SIZE, parseInterviewCatalogue } from "@/lib/interview-catalogue";

const profile = {
  id: 7,
  title: " Software developer ",
  description: "A curated role.",
  category: "Tech",
  interviewMode: "assessment",
  questionsPerInterview: 5,
  availableDifficulties: ["easy", "medium"],
  created_at: "2026-10-30T09:00:00Z",
};

it("accepts a bounded role catalogue and normalizes only its display text", () => {
  expect(parseInterviewCatalogue({ items: [profile], total: 1 })).toEqual({
    total: 1,
    items: [
      {
        ...profile,
        title: "Software developer",
        questionsPerInterview: 5,
      },
    ],
  });
});

it.each([
  ["duplicate role ids", [profile, { ...profile }]],
  ["unknown interview purpose", [{ ...profile, interviewMode: "human" }]],
  ["duplicate difficulty", [{ ...profile, availableDifficulties: ["easy", "easy"] }]],
  [
    "oversized role page",
    Array.from({ length: INTERVIEW_CATALOGUE_PAGE_SIZE + 1 }, (_, id) => ({
      ...profile,
      id: id + 1,
    })),
  ],
  ["invalid published date", [{ ...profile, created_at: "tomorrow maybe" }]],
])("rejects %s before an entry screen renders it", (_name, items) => {
  expect(parseInterviewCatalogue({ items, total: items.length })).toBeNull();
});

it("turns an invalid question count into an unavailable role instead of guessing a count", () => {
  expect(
    parseInterviewCatalogue({
      items: [{ ...profile, questionsPerInterview: 0 }],
      total: 1,
    })?.items[0]?.questionsPerInterview
  ).toBeNull();
});

// What the API really sends names the date createdAt (not created_at), with extra fields.
const apiRole = {
  id: 7,
  title: "Backend developer",
  description: "Build and run APIs.",
  category: "General Role",
  interviewMode: "assessment",
  questionsPerInterview: 5,
  availableDifficulties: ["easy", "medium"],
  createdAt: "2026-11-03T08:12:37.846296Z",
  created_at: undefined,
  jobName: "Backend developer",
  status: "published",
};

it("accepts a role as the API really sends it, with the date named createdAt", () => {
  const { created_at: _omitted, ...sent } = apiRole;
  const page = parseInterviewCatalogue({ items: [sent], total: 1 });
  expect(page?.items).toHaveLength(1);
  expect(page?.items[0]).toMatchObject({
    id: 7,
    title: "Backend developer",
    created_at: "2026-11-03T08:12:37.846296Z",
    availableDifficulties: ["easy", "medium"],
  });
});

it("still rejects a role whose date is invalid under either name, or missing under both", () => {
  const { created_at: _omitted, ...sent } = apiRole;
  expect(
    parseInterviewCatalogue({ items: [{ ...sent, createdAt: "tomorrow maybe" }], total: 1 })
  ).toBeNull();
  const { createdAt: _removed, ...undated } = sent;
  expect(parseInterviewCatalogue({ items: [undated], total: 1 })).toBeNull();
});
