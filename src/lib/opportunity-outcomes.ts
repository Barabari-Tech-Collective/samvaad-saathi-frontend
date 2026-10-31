export interface OpportunityOutcome {
  opportunityId: number;
  revision: number;
  title: string;
  organisation: string;
  decision: "include" | "exclude";
  feedback: string;
  nextStep: string;
  releasedAt: string;
}

const text = (value: unknown, maximum: number): string | null =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum
    ? value.trim()
    : null;

/** Only render complete, explicitly released, student-safe outcome records. */
export function parseOpportunityOutcomes(value: unknown): OpportunityOutcome[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items))
    return null;
  const raw = (value as { items: unknown[] }).items;
  if (raw.length > 200) return null;
  const outcomes: OpportunityOutcome[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const opportunityId = row.opportunity_id;
    const revision = row.revision;
    const title = text(row.title, 160);
    const organisation = text(row.organisation, 160);
    const feedback = text(row.feedback, 2_000);
    const nextStep = text(row.next_step, 1_000);
    const releasedAt = row.released_at;
    if (
      !Number.isSafeInteger(opportunityId) ||
      (opportunityId as number) < 1 ||
      !Number.isSafeInteger(revision) ||
      (revision as number) < 1 ||
      !title ||
      !organisation ||
      !feedback ||
      !nextStep ||
      (row.decision !== "include" && row.decision !== "exclude") ||
      typeof releasedAt !== "string" ||
      !Number.isFinite(Date.parse(releasedAt))
    )
      return null;
    outcomes.push({
      opportunityId: opportunityId as number,
      revision: revision as number,
      title,
      organisation,
      decision: row.decision,
      feedback,
      nextStep,
      releasedAt,
    });
  }
  return new Set(outcomes.map((item) => `${item.opportunityId}:${item.revision}`)).size ===
    outcomes.length
    ? outcomes
    : null;
}
