import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProctoring } from "@/hooks/useProctoring";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

/**
 * useProctoring is the client half of ending an Assessment interview on a
 * tab switch or fullscreen exit - deterrence, not unbypassable enforcement
 * (see the hook's own module doc). What these tests pin is the part that is
 * fully this hook's responsibility: it must fire exactly once per sitting,
 * it must never engage for a disabled (practice) interview, and a fullscreen
 * request that the browser silently refuses must not itself look like an
 * exit violation.
 */

function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => element,
  });
}

describe("useProctoring", () => {
  let requestFullscreenMock: ReturnType<typeof vi.fn>;
  let exitFullscreenMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
    exitFullscreenMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreenMock,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreenMock,
    });
    setFullscreenElement(null);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    setFullscreenElement(null);
  });

  it("does nothing when disabled - a practice interview must never activate", () => {
    const reportViolation = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ enabled: false, interviewId: 1, reportViolation })
    );

    act(() => result.current.openPreflight());

    expect(result.current.showPreflight).toBe(false);
  });

  it("opens the preflight when enabled", () => {
    const reportViolation = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 1, reportViolation })
    );

    act(() => result.current.openPreflight());

    expect(result.current.showPreflight).toBe(true);
  });

  it("requests fullscreen and activates on beginProctoredSession", async () => {
    const reportViolation = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 1, reportViolation })
    );

    await act(async () => {
      await result.current.beginProctoredSession();
    });

    expect(requestFullscreenMock).toHaveBeenCalledOnce();
    expect(result.current.isActive).toBe(true);
    expect(result.current.showPreflight).toBe(false);
  });

  it("terminates with tab_switch and reports it when the tab is hidden", async () => {
    const reportViolation = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation })
    );

    await act(async () => {
      await result.current.beginProctoredSession();
    });

    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.isTerminated).toBe(true);
    expect(result.current.terminationReason).toBe("tab_switch");
    expect(result.current.isActive).toBe(false);
    await waitFor(() =>
      expect(reportViolation).toHaveBeenCalledWith({ interviewId: 7, reason: "tab_switch" })
    );
  });

  it("terminates with fullscreen_exit when fullscreen was engaged and then dropped", async () => {
    const reportViolation = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation })
    );

    await act(async () => {
      setFullscreenElement(document.documentElement);
      await result.current.beginProctoredSession();
    });

    act(() => {
      setFullscreenElement(null);
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.terminationReason).toBe("fullscreen_exit");
    await waitFor(() =>
      expect(reportViolation).toHaveBeenCalledWith({ interviewId: 7, reason: "fullscreen_exit" })
    );
  });

  it("does not treat a refused fullscreen request as an exit violation", async () => {
    requestFullscreenMock.mockRejectedValue(new Error("not allowed"));
    const reportViolation = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation })
    );

    await act(async () => {
      await result.current.beginProctoredSession();
    });
    expect(result.current.isActive).toBe(true);

    // A browser that never engaged fullscreen can still emit the change
    // event; it must not look like the student left a lock that was never on.
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.isTerminated).toBe(false);
    expect(reportViolation).not.toHaveBeenCalled();
  });

  it("fires the termination report exactly once even if both detectors fire", async () => {
    const reportViolation = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation })
    );

    await act(async () => {
      setFullscreenElement(document.documentElement);
      await result.current.beginProctoredSession();
    });

    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      setFullscreenElement(null);
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    await waitFor(() => expect(reportViolation).toHaveBeenCalledTimes(1));
    expect(result.current.terminationReason).toBe("tab_switch");
  });

  it("calls onTerminated once, after the violation is recorded", async () => {
    const reportViolation = vi.fn().mockResolvedValue(undefined);
    const onTerminated = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation, onTerminated })
    );

    await act(async () => {
      await result.current.beginProctoredSession();
    });
    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onTerminated).toHaveBeenCalledExactlyOnceWith("tab_switch");
  });

  it("blocks copy, cut, paste and right-click once active, without terminating", async () => {
    const reportViolation = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: 7, reportViolation })
    );

    await act(async () => {
      await result.current.beginProctoredSession();
    });

    const copyEvent = new Event("copy", { cancelable: true }) as ClipboardEvent;
    const pasteEvent = new Event("paste", { cancelable: true }) as ClipboardEvent;
    const contextMenuEvent = new Event("contextmenu", { cancelable: true }) as MouseEvent;

    act(() => {
      document.dispatchEvent(copyEvent);
      document.dispatchEvent(pasteEvent);
      document.dispatchEvent(contextMenuEvent);
    });

    expect(copyEvent.defaultPrevented).toBe(true);
    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(contextMenuEvent.defaultPrevented).toBe(true);
    expect(result.current.isTerminated).toBe(false);
    expect(reportViolation).not.toHaveBeenCalled();
  });

  it("does not report a violation when interviewId is not yet known", async () => {
    const reportViolation = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ enabled: true, interviewId: null, reportViolation })
    );

    await act(async () => {
      await result.current.beginProctoredSession();
    });
    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.isTerminated).toBe(true);
    expect(reportViolation).not.toHaveBeenCalled();
  });
});
