import { expect, it } from "vitest";
import { parseLearningPlanPage, validReflection } from "@/lib/learning-plans";

const assignment = {
  id: 12,
  course_id: "course-a",
  source: "assigned",
  status: "active",
  version: 1,
  reason: "Prepare for your viva.",
  due_date: null,
  created_at: "2026-10-31T09:00:00Z",
  closed_at: null,
  plan: {
    id: 4,
    title: "Explain your project",
    goal: "Give a clear project explanation.",
    version: 1,
  },
  completed_steps: 1,
  total_steps: 3,
  steps: [
    {
      id: 30,
      position: 1,
      kind: "drill",
      title: "Warm up",
      instructions: null,
      module: "warm_up",
      module_label: "Warm-up chat",
      job_profile_id: null,
      job_name: null,
      status: "done",
      completed_at: "2026-10-31T09:01:00Z",
      reflection: null,
    },
    {
      id: 31,
      position: 2,
      kind: "reflection",
      title: "Reflect",
      instructions: null,
      module: null,
      module_label: null,
      job_profile_id: null,
      job_name: null,
      status: "current",
      completed_at: null,
      reflection: null,
    },
    {
      id: 32,
      position: 3,
      kind: "mock",
      title: "Project mock",
      instructions: null,
      module: null,
      module_label: null,
      job_profile_id: 9,
      job_name: "Project analyst",
      status: "upcoming",
      completed_at: null,
      reflection: null,
    },
  ],
};

it("accepts a complete ordered plan and exposes only its server current step", () => {
  expect(parseLearningPlanPage({ items: [assignment] })?.items[0]).toMatchObject({
    id: 12,
    completedSteps: 1,
    totalSteps: 3,
    steps: expect.arrayContaining([
      expect.objectContaining({ status: "done" }),
      expect.objectContaining({ status: "current" }),
    ]),
  });
});

it.each([
  [
    "two current steps",
    {
      ...assignment,
      steps: assignment.steps.map((step) => ({
        ...step,
        status: step.status === "upcoming" ? "current" : step.status,
      })),
    },
  ],
  [
    "out-of-order positions",
    {
      ...assignment,
      steps: [{ ...assignment.steps[0], position: 2 }, ...assignment.steps.slice(1)],
    },
  ],
  [
    "a drill with a job profile",
    {
      ...assignment,
      steps: [{ ...assignment.steps[0], job_profile_id: 1 }, ...assignment.steps.slice(1)],
    },
  ],
  ["a count that does not match its steps", { ...assignment, total_steps: 4 }],
])("rejects %s rather than inventing progress", (_name, row) => {
  expect(parseLearningPlanPage({ items: [row] })).toBeNull();
});

it("requires a bounded, meaningful reflection", () => {
  expect(validReflection("  I will give a clearer example next time.  ")).toBe(
    "I will give a clearer example next time."
  );
  expect(validReflection("Too short")).toBeNull();
  expect(validReflection("x".repeat(2_001))).toBeNull();
});
