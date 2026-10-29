import { productSession } from "@/lib/session-runtime";
import { createSessionAxios } from "@/lib/session-axios";
import { assertAuthRevision } from "@/lib/auth-session";
import { getTokenFromCookies } from "@/lib/token-utils";

/** Callers retain their page's revision across every step of a workflow. */
export async function accountJson<T>(
  url: string,
  ownerRevision: number,
  init: RequestInit = {}
): Promise<T> {
  assertAuthRevision(ownerRevision);
  const session = productSession();
  if (session) {
    const api = createSessionAxios(process.env.NEXT_PUBLIC_API_BASE_URL || '', session);
    try {
      const response = await api.request<T>({ url, method: init.method || 'GET', data: init.body,
        headers: Object.fromEntries(new Headers(init.headers).entries()), signal: init.signal || undefined });
      assertAuthRevision(ownerRevision);
      return response.data;
    } catch (error) { assertAuthRevision(ownerRevision); throw error; }
  }
  const token = getTokenFromCookies();
  if (!token) throw new Error("Sign in again to continue.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  try {
    const response = await fetch(url, { ...init, headers });
    assertAuthRevision(ownerRevision);
    if (!response.ok) throw new Error("The request could not be completed. Please try again.");
    const data: T = await response.json();
    assertAuthRevision(ownerRevision);
    return data;
  } catch (error) {
    // Even network/body failures must not be delivered to another account.
    assertAuthRevision(ownerRevision);
    throw error;
  }
}
