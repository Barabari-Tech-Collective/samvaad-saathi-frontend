import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProctoring } from "@/hooks/useProctoring";

function fullscreen(element: Element | null) {
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: element });
}
function hidden(value: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, value });
}
const begin = async (enabled = true, reportViolation = vi.fn().mockResolvedValue({})) => {
  const hook = renderHook(() => useProctoring({ enabled, interviewId: 7, reportViolation }));
  await act(async () => {
    await hook.result.current.beginProctoredSession();
  });
  return { ...hook, reportViolation };
};
describe("non-punitive assessment signals", () => {
  beforeEach(() => {
    fullscreen(null);
    hidden(false);
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });
  it("does not open assessment preflight for practice", () => {
    const { result } = renderHook(() =>
      useProctoring({ enabled: false, interviewId: 7, reportViolation: vi.fn() })
    );
    act(() => result.current.openPreflight());
    expect(result.current.showPreflight).toBe(false);
  });
  it("opens and cancels an assessment preflight", () => {
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation: vi.fn() })
    );
    act(() => result.current.openPreflight());
    expect(result.current.showPreflight).toBe(true);
    act(() => result.current.closePreflight());
    expect(result.current.showPreflight).toBe(false);
  });
  it("records a tab switch without terminating or stopping the round", async () => {
    const { result, reportViolation } = await begin();
    act(() => {
      hidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(result.current.reportState).toBe("saved"));
    expect(result.current.isActive).toBe(true);
    expect(result.current.notice).toBe("tab_switch");
    expect(reportViolation).toHaveBeenCalledWith({
      interviewId: 7,
      reason: "tab_switch",
      eventId: expect.any(String),
    });
    act(() => result.current.acknowledge());
    expect(result.current.notice).toBeNull();
  });
  it("does not classify blur or permission prompts as misconduct", async () => {
    const { reportViolation } = await begin();
    act(() => {
      window.dispatchEvent(new Event("blur"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(reportViolation).not.toHaveBeenCalled();
  });
  it("records fullscreen exit only after fullscreen was engaged", async () => {
    const { result, reportViolation } = await begin();
    act(() => document.dispatchEvent(new Event("fullscreenchange")));
    expect(reportViolation).not.toHaveBeenCalled();
    act(() => {
      fullscreen(document.documentElement);
      document.dispatchEvent(new Event("fullscreenchange"));
      fullscreen(null);
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    await waitFor(() => expect(result.current.notice).toBe("fullscreen_exit"));
    expect(result.current.isActive).toBe(true);
  });
  it("can continue when fullscreen is denied", async () => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error("denied")),
    });
    const { result, reportViolation } = await begin();
    expect(result.current.isActive).toBe(true);
    expect(reportViolation).not.toHaveBeenCalled();
  });
  it("retries a failed signal with the same event ID", async () => {
    const report = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    const { result } = await begin(true, report);
    act(() => {
      hidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(result.current.reportState).toBe("failed"));
    await act(async () => {
      await result.current.retryReport();
    });
    expect(report.mock.calls[0][0].eventId).toBe(report.mock.calls[1][0].eventId);
    expect(result.current.isActive).toBe(true);
    expect(result.current.reportState).toBe("saved");
  });
  it("does not double-report bursts of browser events", async () => {
    const { reportViolation } = await begin();
    act(() => {
      hidden(true);
      for (let i = 0; i < 6; i++) document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(reportViolation).toHaveBeenCalledTimes(1));
  });
  it("never monitors practice even if begin is called", async () => {
    const { reportViolation } = await begin(false);
    act(() => {
      hidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(reportViolation).not.toHaveBeenCalled();
  });
  it("removes monitoring when the session unmounts", async () => {
    const { unmount, reportViolation } = await begin();
    unmount();
    act(() => {
      hidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(reportViolation).not.toHaveBeenCalled();
  });
});
