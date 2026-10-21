import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useViewLifetime } from "@/hooks/useViewLifetime";
describe("view-owned requests", () => {
  it("aborts transport and rejects follow-on work after unmount", () => {
    const { result, unmount } = renderHook(() => useViewLifetime());
    const value = result.current;
    const signal = value.requestConfig._signalGetter();
    expect(value.isCurrent()).toBe(true);
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    expect(value.isCurrent()).toBe(false);
    expect(() => value.requireCurrent()).toThrow("view has changed");
  });
  it("keeps same-view checks stable across renders", () => {
    const { result, rerender } = renderHook(() => useViewLifetime());
    const current = result.current;
    act(() => rerender());
    expect(result.current.isCurrent).toBe(current.isCurrent);
    expect(result.current.requestConfig).toBe(current.requestConfig);
  });
});
