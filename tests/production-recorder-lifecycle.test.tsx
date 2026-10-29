import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useDrillRecorder } from "@/hooks/useDrillRecorder";
class Recorder {
  static instances: Recorder[] = [];
  state = "inactive";
  mimeType = "audio/mp4";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public stream: MediaStream) {
    Recorder.instances.push(this);
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
  }
  finish(data = new Blob(["voice"], { type: this.mimeType })) {
    this.ondataavailable?.({ data });
    this.onstop?.();
  }
}
let stopTrack: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;
let stream: MediaStream;
beforeEach(() => {
  Recorder.instances = [];
  stopTrack = vi.fn();
  stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("releases microphone permission arriving after unmount without starting a recorder", async () => {
  let resolve!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const view = renderHook(() => useDrillRecorder(1));
  act(() => {
    void view.result.current.start();
  });
  view.unmount();
  await act(async () => resolve(stream));
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(Recorder.instances).toHaveLength(0);
});
it("allows only one simultaneous capture request", async () => {
  const { result } = renderHook(() => useDrillRecorder(1));
  await act(async () => {
    await Promise.all([result.current.start(), result.current.start()]);
  });
  expect(getUserMedia).toHaveBeenCalledOnce();
  expect(Recorder.instances).toHaveLength(1);
});
it("waits for final recorder data and preserves the actual browser MIME type", async () => {
  const { result } = renderHook(() => useDrillRecorder(1));
  await act(async () => result.current.start());
  act(() => result.current.stop());
  expect(result.current.status).toBe("stopping");
  expect(result.current.blob).toBeNull();
  act(() => Recorder.instances[0].finish());
  expect(result.current.status).toBe("stopped");
  expect(result.current.blob?.type).toBe("audio/mp4");
  expect(result.current.blob?.size).toBe(5);
  expect(stopTrack).toHaveBeenCalled();
});
it("turns empty captures into a recoverable error", async () => {
  const { result } = renderHook(() => useDrillRecorder(1));
  await act(async () => result.current.start());
  act(() => result.current.stop());
  act(() => Recorder.instances[0].finish(new Blob([])));
  expect(result.current.status).toBe("idle");
  expect(result.current.blob).toBeNull();
  expect(result.current.error).toContain("No audio");
});
it("releases the stream if recorder construction fails", async () => {
  vi.stubGlobal(
    "MediaRecorder",
    class {
      constructor() {
        throw new Error("unsupported");
      }
    }
  );
  const { result } = renderHook(() => useDrillRecorder(1));
  await act(async () => result.current.start());
  expect(stopTrack).toHaveBeenCalled();
  expect(result.current.status).toBe("idle");
  expect(result.current.error).toContain("Could not record");
});
it("rejects late grants after a level change", async () => {
  let resolve!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const { result, rerender } = renderHook(({ level }) => useDrillRecorder(level), {
    initialProps: { level: 1 },
  });
  act(() => {
    void result.current.start();
  });
  rerender({ level: 2 });
  await act(async () => resolve(stream));
  expect(stopTrack).toHaveBeenCalled();
  expect(result.current.status).toBe("idle");
  expect(Recorder.instances).toHaveLength(0);
});
it("cleans up and permits retry after a runtime recorder error", async () => {
  const { result } = renderHook(() => useDrillRecorder(1));
  await act(async () => result.current.start());
  act(() => Recorder.instances[0].onerror?.());
  expect(stopTrack).toHaveBeenCalled();
  expect(result.current.error).toContain("unexpectedly");
  await act(async () => result.current.start());
  expect(Recorder.instances).toHaveLength(2);
});
it("ignores old recorder events after reset and stops tracks on unmount", async () => {
  const { result, unmount } = renderHook(() => useDrillRecorder(1));
  await act(async () => result.current.start());
  const previous = Recorder.instances[0];
  act(() => result.current.reset());
  act(() => previous.finish());
  expect(result.current.status).toBe("idle");
  expect(result.current.blob).toBeNull();
  await act(async () => result.current.start());
  unmount();
  expect(Recorder.instances[1].state).toBe("inactive");
  expect(stopTrack).toHaveBeenCalled();
});
