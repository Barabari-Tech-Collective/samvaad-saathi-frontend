import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const transport = vi.hoisted(() => ({ convert: vi.fn() }));
vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({ useMutation: () => ({ mutateAsync: transport.convert }) }),
}));
import { resolveStoredTtsVoiceId, useTextToSpeech } from "@/hooks/useTextToSpeech";
import { DEFAULT_TTS_VOICE_ID } from "@/lib/constants";

class AudioStub {
  static instances: AudioStub[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  oncanplay: (() => void) | null = null;
  currentTime = 0;
  pause = vi.fn();
  play = vi.fn().mockResolvedValue(undefined);
  load = vi.fn();
  constructor() {
    AudioStub.instances.push(this);
  }
}
class UtteranceStub {
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
}
const blob = () => new Blob(["a".repeat(200)], { type: "audio/mpeg" });
function deferred() {
  let resolve!: (value: Blob) => void;
  const promise = new Promise<Blob>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  transport.convert.mockReset();
  AudioStub.instances = [];
  vi.stubGlobal("Audio", AudioStub);
  vi.stubGlobal("SpeechSynthesisUtterance", UtteranceStub);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn().mockReturnValue("blob:test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.stubGlobal("speechSynthesis", {
    speaking: false,
    pending: false,
    getVoices: () => [],
    speak: vi.fn(),
    cancel: vi.fn(),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("speech callback lifetime", () => {
  it("does not play a provider result after stop", async () => {
    const pending = deferred();
    transport.convert.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useTextToSpeech({ text: "First" }));
    act(() => result.current.stop());
    await act(async () => {
      pending.resolve(blob());
      await pending.promise;
    });
    expect(AudioStub.instances).toHaveLength(0);
    expect(result.current.isSpeaking).toBe(false);
  });
  it("unmount discards late provider audio", async () => {
    const pending = deferred();
    transport.convert.mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useTextToSpeech({ text: "First" }));
    unmount();
    await act(async () => {
      pending.resolve(blob());
      await pending.promise;
    });
    expect(AudioStub.instances).toHaveLength(0);
  });
  it("an old audio completion cannot unlock the next question's speech", async () => {
    transport.convert.mockResolvedValue(blob());
    const { result, rerender } = renderHook(({ text }) => useTextToSpeech({ text }), {
      initialProps: { text: "First" },
    });
    await act(async () => {});
    const old = AudioStub.instances[0];
    const ended = old.onended;
    rerender({ text: "Second" });
    await act(async () => {});
    expect(result.current.isSpeaking).toBe(true);
    act(() => ended?.());
    expect(result.current.isSpeaking).toBe(true);
    expect(old.pause).toHaveBeenCalled();
    act(() => AudioStub.instances[1].onended?.());
    expect(result.current.isSpeaking).toBe(false);
  });
  it("watchdog releases input and rejects late audio instead of playing over an answer", async () => {
    vi.useFakeTimers();
    const pending = deferred();
    transport.convert.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useTextToSpeech({ text: "Slow provider" }));
    expect(result.current.isPreparing).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(result.current.isPreparing).toBe(false);
    await act(async () => {
      pending.resolve(blob());
      await pending.promise;
    });
    expect(AudioStub.instances).toHaveLength(0);
  });
  it("late browser speech events cannot reenable speaking after stop", async () => {
    transport.convert.mockResolvedValue(new Blob());
    const { result } = renderHook(() => useTextToSpeech({ text: "Fallback" }));
    await act(async () => {});
    const utterance = vi.mocked(window.speechSynthesis.speak).mock
      .calls[0][0] as unknown as UtteranceStub;
    act(() => result.current.stop());
    act(() => utterance.onstart?.());
    expect(result.current.isSpeaking).toBe(false);
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
  it("stopping while supplied audio loads never starts a fallback provider request", async () => {
    vi.useFakeTimers();
    transport.convert.mockResolvedValue(blob());
    const { result } = renderHook(() =>
      useTextToSpeech({ text: "Cached audio", audioUrl: "https://example.test/audio" })
    );
    act(() => result.current.stop());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(transport.convert).not.toHaveBeenCalled();
  });
  it("does not cut off successfully playing audio when the preparation budget elapses", async () => {
    vi.useFakeTimers();
    transport.convert.mockResolvedValue(blob());
    const { result } = renderHook(() => useTextToSpeech({ text: "A longer question" }));
    await act(async () => {});
    expect(result.current.isSpeaking).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(result.current.isSpeaking).toBe(true);
    expect(AudioStub.instances[0].pause).not.toHaveBeenCalled();
  });
  it("blocked voice preference storage falls back safely", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    expect(resolveStoredTtsVoiceId()).toBe(DEFAULT_TTS_VOICE_ID);
  });
});
