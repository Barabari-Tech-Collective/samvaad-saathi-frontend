import { describe, expect, it } from "vitest";
import {
  groupByCourse,
  parsePlacementOptions,
  parsePlacementOverview,
  toggleChoice,
  type PlacementChoice,
} from "@/lib/placement";

const choice = (key: string, course: string, name = "Batch 2026"): PlacementChoice => ({
  batch_key: key,
  batch_name: name,
  course_id: course,
  course_name: course === "7" ? "Full Stack Development" : "Data Analytics",
  label: `Course ${course} · ${name}`,
});

const items = [
  choice("fs-2026", "7"),
  choice("fs-2025", "7", "Batch 2025"),
  choice("da-2025", "8", "Batch 2025"),
];

describe("choosing batches", () => {
  it("allows several courses", () => {
    const first = toggleChoice([], "fs-2026", items);
    expect(toggleChoice(first, "da-2025", items)).toEqual(["fs-2026", "da-2025"]);
  });

  it("replaces another batch of the same course", () => {
    expect(toggleChoice(["fs-2026", "da-2025"], "fs-2025", items)).toEqual(["da-2025", "fs-2025"]);
  });

  it("un-chooses a batch that is already chosen", () => {
    expect(toggleChoice(["fs-2026", "da-2025"], "fs-2026", items)).toEqual(["da-2025"]);
  });

  it("ignores a batch that is not in the list", () => {
    expect(toggleChoice(["fs-2026"], "unknown", items)).toEqual(["fs-2026"]);
  });

  it("groups batches under their course in the order given", () => {
    const groups = groupByCourse(items);
    expect(groups.map((g) => [g.title, g.batches.length])).toEqual([
      ["Full Stack Development", 2],
      ["Data Analytics", 1],
    ]);
  });

  it("names a course by its number when it has no name", () => {
    const nameless = { ...choice("x", "9"), course_name: null };
    expect(groupByCourse([nameless])[0].title).toBe("Course 9");
  });
});

describe("what the server sends", () => {
  const overview = {
    needs_placement: false,
    college: "City College",
    selected: [{ ...choice("fs-2026", "7"), selected_at: "2026-11-03T10:00:00Z" }],
  };

  it("accepts the documented overview", () => {
    expect(parsePlacementOverview(overview)?.selected[0].batch_key).toBe("fs-2026");
  });

  it("never turns a malformed answer into 'nothing chosen'", () => {
    expect(parsePlacementOverview(null)).toBeNull();
    expect(parsePlacementOverview({ ...overview, needs_placement: "no" })).toBeNull();
    expect(parsePlacementOverview({ ...overview, selected: [{ batch_key: "a" }] })).toBeNull();
    expect(
      parsePlacementOverview({ ...overview, selected: [{ ...choice("a", "7") }] }) // no selected_at
    ).toBeNull();
  });

  it("accepts a learner with no college", () => {
    expect(parsePlacementOverview({ ...overview, college: null })?.college).toBeNull();
  });

  it("refuses a list with even one bad row", () => {
    const good = { items: items, stale: false };
    expect(parsePlacementOptions(good)?.items).toHaveLength(3);
    expect(
      parsePlacementOptions({ items: [...items, { batch_key: "x" }], stale: false })
    ).toBeNull();
    expect(parsePlacementOptions({ items, stale: "no" })).toBeNull();
  });
});
