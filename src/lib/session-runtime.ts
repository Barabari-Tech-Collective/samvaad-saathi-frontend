import { ServerSessionClient } from "@/lib/server-session-client";

export const cookieSessionEnabled = process.env.NEXT_PUBLIC_AUTH_MODE === "server-session";
let client: ServerSessionClient | undefined;
// BroadcastChannel sends to other channel objects in the same tab too.
// Ignore our own announcements; only another tab should invalidate this client.
export const sessionBroadcastSource = typeof window === "undefined" ? "" : crypto.randomUUID();
/** One lifecycle/identity owner for all student transports. Never constructed during SSR. */
export function productSession(): ServerSessionClient | undefined {
  if (!cookieSessionEnabled || typeof window === "undefined") return undefined;
  client ??= new ServerSessionClient(process.env.NEXT_PUBLIC_API_BASE_URL || "");
  return client;
}
export function broadcastSessionChange(): void {
  try {
    const channel = new BroadcastChannel("samvaad-cookie-session");
    channel.postMessage({ type: "changed", source: sessionBroadcastSource });
    channel.close();
  } catch {
    /* Focus validation remains available. */
  }
}
