/** Storage denial must not prevent cache invalidation or logout navigation. */
export function clearLogoutStorage() {
  try {
    const storage = window.localStorage;
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    // Language is a device preference, not account data.
    const keep = (key: string) => key === "samvaad-language";
    for (const key of keys) if (key && !keep(key)) storage.removeItem(key);
  } catch {
    /* Storage may be disabled; continue clearing other client state. */
  }
  try {
    window.sessionStorage.clear();
  } catch {
    /* Continue logout if storage is denied. */
  }
}
