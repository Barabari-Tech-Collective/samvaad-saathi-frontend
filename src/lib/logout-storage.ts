/** Storage denial must not prevent cache invalidation or logout navigation. */
export function clearLogoutStorage() {
  try {
    const storage = window.localStorage;
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    // The tour record and the language are device preferences, not account data: keeping them
    // means a student who chose Hindi does not have to choose it again after every sign-in.
    const keep = (key: string) => key.startsWith("samvaad-guide:") || key === "samvaad-language";
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
