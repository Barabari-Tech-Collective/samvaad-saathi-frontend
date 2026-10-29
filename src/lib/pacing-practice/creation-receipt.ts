/** A creation key survives response loss/reload but never crosses accounts or levels. */
export function pacingRequestKey(account: string, level: number): string {
  const storageKey = `pacing-create:${account}:${level}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
  const key = crypto.randomUUID();
  // Fail before dispatch if durable storage is unavailable, rather than create an
  // unrecoverable session and silently mint another key after reload.
  sessionStorage.setItem(storageKey, key);
  return key;
}
export function clearPacingRequestKey(account: string, level: number, expected: string) {
  const key = `pacing-create:${account}:${level}`;
  if (sessionStorage.getItem(key) === expected) sessionStorage.removeItem(key);
}
