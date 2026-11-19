// The student's "WhatsApp updates" setting (suite phase 2D). Sampark keeps the decision and
// every student is on by default; off is the same as replying STOP on WhatsApp.
export type WhatsAppUpdates = { on: boolean; decided_at: string | null };

/** Reads the Samvaad response; anything unexpected is treated as unknown (null), never as "on". */
export function parseWhatsAppUpdates(data: unknown): WhatsAppUpdates | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.on !== "boolean") return null;
  return { on: d.on, decided_at: typeof d.decided_at === "string" ? d.decided_at : null };
}
