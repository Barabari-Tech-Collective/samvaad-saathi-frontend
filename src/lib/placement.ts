// A learner's own choice of course and batch. The server owns the list; these parsers refuse
// anything that is not exactly the documented shape, so an unknown answer never looks like "none".

export interface PlacementChoice {
  batch_key: string;
  batch_name: string;
  course_id: string;
  course_name: string | null;
  label: string;
}

export interface SelectedPlacement extends PlacementChoice {
  selected_at: string;
}

export interface PlacementOverview {
  needs_placement: boolean;
  college: string | null;
  selected: SelectedPlacement[];
}

export interface PlacementOptions {
  items: PlacementChoice[];
  stale: boolean;
}

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function parseChoice(value: unknown): PlacementChoice | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!text(row.batch_key) || !text(row.batch_name) || !text(row.course_id) || !text(row.label))
    return null;
  if (
    row.course_name !== null &&
    row.course_name !== undefined &&
    typeof row.course_name !== "string"
  )
    return null;
  return {
    batch_key: row.batch_key,
    batch_name: row.batch_name,
    course_id: row.course_id,
    course_name:
      typeof row.course_name === "string" && row.course_name.trim() ? row.course_name : null,
    label: row.label,
  };
}

export function parsePlacementOverview(value: unknown): PlacementOverview | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.needs_placement !== "boolean" || !Array.isArray(row.selected)) return null;
  if (row.college !== null && row.college !== undefined && typeof row.college !== "string")
    return null;
  const selected: SelectedPlacement[] = [];
  for (const item of row.selected) {
    const choice = parseChoice(item);
    const at = (item as Record<string, unknown> | null)?.selected_at;
    if (!choice || typeof at !== "string") return null;
    selected.push({ ...choice, selected_at: at });
  }
  return {
    needs_placement: row.needs_placement,
    college: typeof row.college === "string" && row.college.trim() ? row.college : null,
    selected,
  };
}

export function parsePlacementOptions(value: unknown): PlacementOptions | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!Array.isArray(row.items) || typeof row.stale !== "boolean") return null;
  const items: PlacementChoice[] = [];
  for (const item of row.items) {
    const choice = parseChoice(item);
    if (!choice) return null;
    items.push(choice);
  }
  return { items, stale: row.stale };
}

/** Choose or un-choose a batch. Choosing one replaces any other batch of the same course. */
export function toggleChoice(selected: string[], key: string, items: PlacementChoice[]): string[] {
  if (selected.includes(key)) return selected.filter((k) => k !== key);
  const course = items.find((i) => i.batch_key === key)?.course_id;
  if (course === undefined) return selected;
  const sameCourse = new Set(items.filter((i) => i.course_id === course).map((i) => i.batch_key));
  return [...selected.filter((k) => !sameCourse.has(k)), key];
}

export interface CourseGroup {
  course_id: string;
  title: string;
  batches: PlacementChoice[];
}

export function groupByCourse(items: PlacementChoice[]): CourseGroup[] {
  const groups = new Map<string, CourseGroup>();
  for (const item of items) {
    const group = groups.get(item.course_id) ?? {
      course_id: item.course_id,
      title: item.course_name ?? `Course ${item.course_id}`,
      batches: [],
    };
    group.batches.push(item);
    groups.set(item.course_id, group);
  }
  return [...groups.values()];
}
