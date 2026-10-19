export interface SubmissionReceiptData {
  planned: number;
  answered: number;
  skipped: number;
  unresolved: number;
  unreached: number;
  reason: "completed" | "time_limit";
}

export function parseSubmissionReceipt(
  value: unknown,
  interviewId?: string
): SubmissionReceiptData {
  if (!value || typeof value !== "object") throw new Error("Receipt details are unavailable.");
  const row = value as Record<string, unknown>;
  const counts = [row.planned, row.answered, row.skipped, row.unresolved, row.unreached];
  if (
    counts.some((n) => typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) ||
    (row.planned as number) < 1 ||
    counts.slice(1).some((n) => (n as number) > (row.planned as number)) ||
    (row.answered as number) +
      (row.skipped as number) +
      (row.unresolved as number) +
      (row.unreached as number) !==
      row.planned ||
    !["completed", "time_limit"].includes(row.reason as string) ||
    (row.reason === "completed" &&
      ((row.unresolved as number) > 0 || (row.unreached as number) > 0)) ||
    (row.version !== undefined && row.version !== 1) ||
    (row.interviewId !== undefined &&
      (!Number.isSafeInteger(row.interviewId) ||
        (row.interviewId as number) <= 0 ||
        (interviewId !== undefined && String(row.interviewId) !== interviewId))) ||
    (row.presented !== undefined &&
      row.presented !==
        (row.answered as number) + (row.skipped as number) + (row.unresolved as number))
  )
    throw new Error(
      "Receipt details could not be verified. Check History before relying on these counts."
    );
  return value as SubmissionReceiptData;
}

export function parseCompletionEnvelope(value: unknown, interviewId: string) {
  if (!value || typeof value !== "object")
    throw new Error("Completion status could not be verified.");
  const row = value as Record<string, unknown>;
  if (
    typeof row.status !== "string" ||
    !row.status.trim() ||
    !("receipt" in row) ||
    (row.interviewMode != null && !["practice", "assessment"].includes(row.interviewMode as string))
  )
    throw new Error("Completion status could not be verified.");
  return {
    status: row.status,
    interviewMode: row.interviewMode as "practice" | "assessment" | null | undefined,
    receipt: row.receipt === null ? null : parseSubmissionReceipt(row.receipt, interviewId),
  };
}
