import type { InterviewMode } from "@/lib/interview-mode";

// The entry screen renders the full response today. Keep a hard client boundary until the API
// exposes server-side search/pagination, so one malformed or oversized response cannot turn a
// student session into an unresponsive select menu.
export const INTERVIEW_CATALOGUE_PAGE_SIZE = 100;

const DIFFICULTIES = new Set(["easy", "medium", "hard", "expert"]);

export interface InterviewCatalogueProfile {
  questionsPerInterview: number | null;
  id: number;
  title: string;
  description: string;
  category: string | undefined;
  interviewMode: InterviewMode | undefined;
  created_at: string;
  availableDifficulties: string[] | undefined;
}

export interface InterviewCataloguePage {
  items: InterviewCatalogueProfile[];
  total: number;
}

const text = (value: unknown, maximum: number): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
};

const optionalText = (value: unknown, maximum: number): string | undefined | null => {
  if (value === undefined || value === null) return undefined;
  return text(value, maximum) ?? null;
};

const publishedCount = (value: unknown): number | null =>
  Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 50
    ? (value as number)
    : null;

/**
 * Treat the published role catalogue as untrusted API input. In particular, the interview mode
 * must be explicit before a profile can be shown in the assessment picker, and a bad published
 * question count becomes an unavailable role rather than a guessed count.
 */
export function parseInterviewCatalogue(value: unknown): InterviewCataloguePage | null {
  if (!value || typeof value !== "object") return null;
  const page = value as Record<string, unknown>;
  if (
    !Array.isArray(page.items) ||
    page.items.length > INTERVIEW_CATALOGUE_PAGE_SIZE ||
    !Number.isSafeInteger(page.total) ||
    (page.total as number) < page.items.length ||
    (page.total as number) < 0
  )
    return null;

  const ids = new Set<number>();
  const items: InterviewCatalogueProfile[] = [];
  for (const value of page.items) {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const id = row.id;
    const title = text(row.title, 200);
    const description = text(row.description, 5_000);
    const category = optionalText(row.category, 100);
    const createdAt =
      typeof row.created_at === "string" && Number.isFinite(Date.parse(row.created_at))
        ? row.created_at
        : null;
    const mode = row.interviewMode;
    const difficulties = row.availableDifficulties;
    if (
      !Number.isSafeInteger(id) ||
      (id as number) < 1 ||
      ids.has(id as number) ||
      !title ||
      !description ||
      category === null ||
      !createdAt ||
      (mode !== undefined && mode !== "practice" && mode !== "assessment") ||
      (difficulties !== undefined &&
        (!Array.isArray(difficulties) ||
          difficulties.length > DIFFICULTIES.size ||
          difficulties.some(
            (difficulty) => typeof difficulty !== "string" || !DIFFICULTIES.has(difficulty)
          ) ||
          new Set(difficulties).size !== difficulties.length))
    )
      return null;

    ids.add(id as number);
    items.push({
      id: id as number,
      title,
      description,
      category,
      created_at: createdAt,
      interviewMode: mode as InterviewMode | undefined,
      availableDifficulties: difficulties as string[] | undefined,
      questionsPerInterview: publishedCount(row.questionsPerInterview),
    });
  }
  return { items, total: page.total as number };
}
