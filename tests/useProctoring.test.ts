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

describe("assessment observation ownership", () => {
  beforeEach(() => {
    fullscreen(null);
    hidden(false);
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });
  const visibility = () =>
    act(() => {
      hidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });
  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }
  it.each([null, 0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1])(
    "invalid sitting %s cannot activate monitoring",
    async (interviewId) => {
      const report = vi.fn();
      const { result } = renderHook(() =>
        useProctoring({ enabled: true, interviewId, scopeKey: "a", reportViolation: report })
      );
      await act(async () => expect(await result.current.beginProctoredSession()).toBe(false));
      visibility();
      expect(report).not.toHaveBeenCalled();
    }
  );
  it("clears an old pending event when the sitting changes", async () => {
    const report = vi.fn().mockRejectedValue(new Error("offline"));
    const { result, rerender } = renderHook(
      ({ id }) =>
        useProctoring({ enabled: true, interviewId: id, scopeKey: "a", reportViolation: report }),
      { initialProps: { id: 7 } }
    );
    await act(async () => {
      await result.current.beginProctoredSession();
    });
    visibility();
    await waitFor(() => expect(result.current.reportState).toBe("failed"));
    rerender({ id: 8 });
    expect(result.current.isActive).toBe(false);
    expect(result.current.notice).toBeNull();
    expect(result.current.reportState).toBe("idle");
    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => {
      await result.current.retryReport();
    });
    expect(report).toHaveBeenCalledTimes(1);
  });
  it("late success cannot mark the new account's signal saved or release its in-flight fence", async () => {
    const first = deferred();
    const second = deferred();
    const report = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result, rerender } = renderHook(
      ({ account }) =>
        useProctoring({
          enabled: true,
          interviewId: 7,
          scopeKey: account,
          reportViolation: report,
        }),
      { initialProps: { account: "a" } }
    );
    await act(async () => {
      await result.current.beginProctoredSession();
    });
    visibility();
    rerender({ account: "b" });
    await act(async () => {
      await result.current.beginProctoredSession();
    });
    visibility();
    expect(report).toHaveBeenCalledTimes(2);
    await act(async () => {
      first.resolve();
      await first.promise;
    });
    expect(result.current.reportState).toBe("saving");
    await act(async () => {
      await result.current.retryReport();
    });
    expect(report).toHaveBeenCalledTimes(2);
    await act(async () => {
      second.resolve();
      await second.promise;
    });
    expect(result.current.reportState).toBe("saved");
  });
  it("disabling and re-enabling requires a fresh begin and does not retry old events", async () => {
    const report = vi.fn().mockRejectedValue(new Error("offline"));
    const { result, rerender } = renderHook(
      ({ enabled }) => useProctoring({ enabled, interviewId: 7, reportViolation: report }),
      { initialProps: { enabled: true } }
    );
    await act(async () => {
      await result.current.beginProctoredSession();
    });
    visibility();
    await waitFor(() => expect(result.current.reportState).toBe("failed"));
    rerender({ enabled: false });
    expect(result.current.isActive).toBe(false);
    expect(result.current.notice).toBeNull();
    rerender({ enabled: true });
    visibility();
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current.isActive).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
  });
  it("cancelling one fullscreen request cannot accidentally accept a later request", async () => {
    const first = deferred();
    const second = deferred();
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: vi
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation: vi.fn() })
    );
    let a!: Promise<boolean>;
    let b!: Promise<boolean>;
    act(() => {
      a = result.current.beginProctoredSession();
    });
    expect(result.current.isBeginning).toBe(true);
    act(() => {
      result.current.closePreflight();
      result.current.openPreflight();
      b = result.current.beginProctoredSession();
    });
    await act(async () => {
      first.resolve();
      expect(await a).toBe(false);
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.isBeginning).toBe(true);
    await act(async () => {
      second.resolve();
      expect(await b).toBe(true);
    });
    expect(result.current.isActive).toBe(true);
  });
  it("context changes and unmount reject pending fullscreen acceptance", async () => {
    const pending = deferred();
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: () => pending.promise,
    });
    const { result, rerender, unmount } = renderHook(
      ({ id }) => useProctoring({ enabled: true, interviewId: id, reportViolation: vi.fn() }),
      { initialProps: { id: 7 } }
    );
    let start!: Promise<boolean>;
    act(() => {
      start = result.current.beginProctoredSession();
    });
    rerender({ id: 8 });
    expect(result.current.isActive).toBe(false);
    unmount();
    await act(async () => {
      pending.resolve();
      expect(await start).toBe(false);
    });
  });
  it("uses the current reporter for same-context retries with the original event ID", async () => {
    const first = vi.fn().mockRejectedValue(new Error("offline"));
    const second = vi.fn().mockResolvedValue({});
    const { result, rerender } = renderHook(
      ({ report }) => useProctoring({ enabled: true, interviewId: 7, reportViolation: report }),
      { initialProps: { report: first } }
    );
    await act(async () => {
      await result.current.beginProctoredSession();
    });
    visibility();
    await waitFor(() => expect(result.current.reportState).toBe("failed"));
    rerender({ report: second });
    await act(async () => {
      await result.current.retryReport();
    });
    expect(second).toHaveBeenCalledWith(first.mock.calls[0][0]);
    expect(result.current.reportState).toBe("saved");
  });
  it("empty account scope cannot begin and unsupported fullscreen is not misconduct", async () => {
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: undefined,
    });
    const report = vi.fn();
    const { result, rerender } = renderHook(
      ({ scope }) =>
        useProctoring({ enabled: true, interviewId: 7, scopeKey: scope, reportViolation: report }),
      { initialProps: { scope: "" } }
    );
    await act(async () => expect(await result.current.beginProctoredSession()).toBe(false));
    rerender({ scope: "a" });
    await act(async () => expect(await result.current.beginProctoredSession()).toBe(true));
    expect(report).not.toHaveBeenCalled();
  });
});
