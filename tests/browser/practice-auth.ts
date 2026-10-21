import { useSyncExternalStore } from "react";
let account = "1";
const subscribe = (listener: () => void) => {
  const changed = (event: Event) => {
    if (event instanceof CustomEvent && typeof event.detail === "string") account = event.detail;
    listener();
  };
  window.addEventListener("practice-test-account", changed);
  return () => window.removeEventListener("practice-test-account", changed);
};
export function useAuth() {
  const id = useSyncExternalStore(
    subscribe,
    () => account,
    () => "1"
  );
  return {
    loading: false,
    user: id ? { userId: id, authorizedUser: { name: id === "1" ? "Riya" : "Aarav" } } : null,
  };
}
