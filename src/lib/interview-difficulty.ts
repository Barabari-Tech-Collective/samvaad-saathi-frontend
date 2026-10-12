/**
 * Which interview difficulties a student may be offered, and when.
 *
 * The picker used to be a hardcoded list of all four levels, always rendered,
 * defaulting to medium. If a facilitator published questions only at easy and a
 * student picked medium - or simply left the default - the backend silently
 * generated AI questions instead, so the student was assessed against that
 * facilitator's role on questions the facilitator had never seen. The server now
 * refuses that and reports `availableDifficulties` per job profile; these helpers
 * are how the picker stays in step with it.
 *
 * The rule is deliberately in one place because it has three distinct cases that
 * are easy to conflate - and conflating two of them is exactly how a first
 * attempt at this broke every non-tech interview.
 */

export const DIFFICULTY_LEVEL = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
  { key: "expert", label: "Expert" },
] as const;

/**
 * Job-profile categories routed to the non-tech interview flow, which fixes its
 * own difficulty server-side and shows no level picker.
 */
export const NON_TECH_CATEGORY_HINTS = ["hr", "non-technical", "communication"];

export function isNonTechCategory(category: string | undefined): boolean {
  if (!category) return false;
  const normalized = category.toLowerCase();
  return NON_TECH_CATEGORY_HINTS.some((hint) => normalized.includes(hint));
}

/**
 * The levels a student may be offered, or `undefined` for "all of them".
 *
 * Three cases, only one of which is restricted:
 *
 * - **Free practice** (no job profile): generated questions are the product, so
 *   every level is legitimate.
 * - **Non-tech** (an HR/communication job profile): there is no level picker,
 *   and the flow falls back to a blueprint when a role has no curated
 *   questions. Restricting it would block those roles entirely.
 * - **Curated tech** (a job profile assessed against published questions): the
 *   only case where the facilitator's published levels bind.
 */
export function offeredDifficulties({
  isTechFlow,
  profileAvailableDifficulties,
}: {
  isTechFlow: boolean;
  profileAvailableDifficulties?: string[];
}): string[] | undefined {
  if (!isTechFlow) return undefined;
  return profileAvailableDifficulties;
}

export function isDifficultyOffered(key: string, offered: string[] | undefined): boolean {
  return !offered || offered.includes(key);
}

/**
 * Correct a selected difficulty that is not on offer.
 *
 * Returns the current choice when it is still valid, otherwise the first level
 * on offer - easiest first, as the server orders them. Without this the medium
 * default would be submitted for an easy-only role on every attempt, and the
 * student would meet a server refusal instead of an interview.
 *
 * Returns an empty string when a role has nothing on offer, so that no level
 * appears selected; callers must block submission in that state rather than
 * sending it.
 */
export function correctedDifficulty(current: string, offered: string[] | undefined): string {
  if (!offered) return current;
  if (offered.includes(current)) return current;
  return offered[0] ?? "";
}

/**
 * Why a chosen level cannot be started, or null when it can.
 *
 * Phrased for a student rather than naming counts or statuses they cannot act
 * on, and names what they *can* start so the screen is not a dead end.
 */
export function unavailableDifficultyMessage(
  difficulty: string,
  offered: string[] | undefined
): string | null {
  if (isDifficultyOffered(difficulty, offered)) return null;
  if (offered && offered.length > 0) {
    return `The ${difficulty} level is not ready for this role yet. Available now: ${offered.join(", ")}.`;
  }
  return "This role has no interview levels ready yet. Please check back once your facilitator has added questions.";
}
