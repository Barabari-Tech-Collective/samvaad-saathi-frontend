import { afterEach, expect, it, vi } from "vitest";
import { clearLogoutStorage } from "@/lib/logout-storage";
afterEach(() => vi.restoreAllMocks());
it("continues to clear session storage even if local storage access is denied", () => {
  const clear = vi.fn();
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new Error("denied");
  });
  vi.spyOn(window, "sessionStorage", "get").mockReturnValue({ clear } as unknown as Storage);
  expect(clearLogoutStorage).not.toThrow();
  expect(clear).toHaveBeenCalledOnce();
});
it("does not throw when both storage APIs are blocked", () => {
  for (const key of ["localStorage", "sessionStorage"] as const)
    vi.spyOn(window, key, "get").mockImplementation(() => {
      throw new Error("denied");
    });
  expect(clearLogoutStorage).not.toThrow();
});
it("keeps only guide preferences and clears account/session data", () => {
  const removeItem = vi.fn();
  const clear = vi.fn();
  vi.spyOn(window, "localStorage", "get").mockReturnValue({
    length: 2,
    key: (index: number) => ["samvaad-guide:1", "answer-draft"][index],
    removeItem,
  } as unknown as Storage);
  vi.spyOn(window, "sessionStorage", "get").mockReturnValue({ clear } as unknown as Storage);
  clearLogoutStorage();
  expect(removeItem).toHaveBeenCalledExactlyOnceWith("answer-draft");
  expect(clear).toHaveBeenCalledOnce();
});
