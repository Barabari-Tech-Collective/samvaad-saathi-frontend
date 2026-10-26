import type { AxiosError } from "axios";

export type SessionLeaseErrorCode =
  | "SESSION_ACTIVE_ELSEWHERE"
  | "SESSION_LEASE_REPLACED"
  | "SESSION_LEASE_EXPIRED"
  | "SESSION_NOT_ACTIVE"
  | "SESSION_LEASE_NOT_AVAILABLE";

type ErrorBody = {
  detail?: string | { code?: string; message?: string };
};

export function getSessionLeaseErrorCode(error: unknown): SessionLeaseErrorCode | null {
  const detail = (error as AxiosError<ErrorBody>)?.response?.data?.detail;
  if (!detail || typeof detail === "string" || typeof detail.code !== "string") return null;
  if (
    [
      "SESSION_ACTIVE_ELSEWHERE",
      "SESSION_LEASE_REPLACED",
      "SESSION_LEASE_EXPIRED",
      "SESSION_NOT_ACTIVE",
      "SESSION_LEASE_NOT_AVAILABLE",
    ].includes(detail.code)
  )
    return detail.code as SessionLeaseErrorCode;
  return null;
}
