import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useInterviewAnswer } from "@/hooks/useInterviewAnswer";
import { useQuestionAttempt } from "@/hooks/useQuestionAttempt";
import Footer from "@/app/(protected)/interview/_components/Footer";

const mocks = vi.hoisted(() => ({ upload: vi.fn(), analyze: vi.fn(), convert: vi.fn() }));
vi.mock("@/lib/audio-utils", () => ({
  AUDIO_CONSTRAINTS_16KHZ: {},
  resampleAudioTo16kHz: mocks.convert,
  cleanupAudioAnalysis: vi.fn(),
  createAudioAnalysisContext: vi.fn(() => {
    throw Error("No waveform");
  }),
  startWaveformAnimation: vi.fn(),
}));
vi.mock("@/lib/posthog/tracking.utils", () => ({
  trackAnswerRecorded: vi.fn(),
  trackAnswerStartClick: vi.fn(),
  trackButtonClick: vi.fn(),
  trackRedoButtonClick: vi.fn(),
  trackSkipQuestionClick: vi.fn(),
  trackSubmitInterviewClick: vi.fn(),
}));
vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({
    useMutation: ({ url }: { url: string }) => ({
      mutateAsync: url.includes("transcribe") ? mocks.upload : mocks.analyze,
      isPending: false,
    }),
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const trackStop = vi.fn();
const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;
class Recorder {
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor(public stream: MediaStream) {}
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["recorded answer"], { type: this.mimeType }) });
    queueMicrotask(() => this.onstop?.());
  }
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.convert.mockResolvedValue(new Blob(["wav"], { type: "audio/wav" }));
  mocks.upload.mockResolvedValue({ saved: true, questionAttemptId: 42 });
  mocks.analyze.mockResolvedValue({});
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("recording recovery", () => {
  it("retains the same file after a failed save and saves it on retry", async () => {
    const save = vi.fn().mockRejectedValueOnce(Error("offline")).mockResolvedValue(undefined);
    const { result } = renderHook(() => useInterviewAnswer({ save }));
    await act(() => result.current.start());
    await act(() => result.current.stop());
    expect(result.current.phase).toBe("failed");
    const original = save.mock.calls[0][0];
    await act(() => result.current.retry());
    expect(result.current.phase).toBe("saved");
    expect(save.mock.calls[1][0]).toBe(original);
    expect(mocks.convert).toHaveBeenCalledTimes(1);
    expect(trackStop).toHaveBeenCalled();
  });
  it("does not duplicate microphone acquisition or a double stop/save", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useInterviewAnswer({ save }));
    await act(async () => {
      await Promise.all([result.current.start(), result.current.start()]);
    });
    await act(async () => {
      await Promise.all([result.current.stop(), result.current.stop()]);
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("recovers from a rejected microphone permission", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(Error("denied"));
    const { result } = renderHook(() => useInterviewAnswer({ save: vi.fn() }));
    await act(() => result.current.start());
    expect(result.current.phase).toBe("idle");
    expect(result.current.error).toContain("Microphone unavailable");
    await act(() => result.current.start());
    expect(result.current.phase).toBe("recording");
  });
  it("times out an ignored permission dialog and releases a late grant", async () => {
    vi.useFakeTimers();
    const permission = deferred<MediaStream>();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(permission.promise);
    const { result } = renderHook(() => useInterviewAnswer({ save: vi.fn() }));
    let starting!: Promise<void>;
    act(() => {
      starting = result.current.start();
    });
    await act(() => vi.advanceTimersByTimeAsync(20_000));
    await act(() => starting);
    expect(result.current.phase).toBe("idle");
    await act(async () => {
      permission.resolve(stream);
    });
    expect(trackStop).toHaveBeenCalled();
  });
  it("retries conversion errors without losing the original recording", async () => {
    mocks.convert.mockRejectedValueOnce(Error("decode"));
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useInterviewAnswer({ save }));
    await act(() => result.current.start());
    await act(() => result.current.stop());
    expect(result.current.phase).toBe("failed");
    expect(save).not.toHaveBeenCalled();
    await act(() => result.current.retry());
    expect(result.current.phase).toBe("saved");
  });
  it("releases the microphone on unmount without saving into another question", async () => {
    const save = vi.fn();
    const { result, unmount } = renderHook(() => useInterviewAnswer({ save }));
    await act(() => result.current.start());
    unmount();
    await act(async () => {});
    expect(trackStop).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("answer controls", () => {
  async function record() {
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Done" }));
  }
  it.each([
    { saved: false, questionAttemptId: 42 },
    { saved: true, questionAttemptId: 99 },
  ])("rejects an unsuccessful or mismatched acknowledgement %j", async (response) => {
    mocks.upload.mockResolvedValueOnce(response);
    const next = vi.fn();
    render(<Footer question_attempt_id={42} onNext={next} />);
    await record();
    fireEvent.click(await screen.findByRole("button", { name: "Retry save" }));
    await screen.findByText("Answer saved.");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(mocks.upload).toHaveBeenCalledTimes(2);
  });
  it("blocks Next and Redo while conversion is still running", async () => {
    const conversion = deferred<Blob>();
    mocks.convert.mockReturnValue(conversion.promise);
    render(<Footer question_attempt_id={42} />);
    await record();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Answer" })).toBeDisabled();
    await act(async () => conversion.resolve(new Blob(["wav"])));
    await screen.findByText("Answer saved.");
  });
  it("keeps Submit disabled after upload failure until retry succeeds", async () => {
    mocks.upload.mockRejectedValueOnce(Error("offline"));
    render(<Footer question_attempt_id={42} isLastQuestion />);
    await record();
    await screen.findByRole("button", { name: "Retry save" });
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await screen.findByText("Answer saved.");
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });
  it("does not enable recording without an attempt id", () => {
    render(<Footer />);
    expect(screen.getByRole("button", { name: "Answer" })).toBeDisabled();
  });
  it("lets Done work even if question playback changes while recording", async () => {
    const { rerender } = render(<Footer question_attempt_id={42} />);
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    await screen.findByRole("button", { name: "Done" });
    rerender(<Footer question_attempt_id={42} disabled />);
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });
  it("flushes the answer at interview expiry, then submits once after saving", async () => {
    const upload = deferred<{ saved: boolean; questionAttemptId: number }>();
    mocks.upload.mockReturnValue(upload.promise);
    const submit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<Footer question_attempt_id={42} onSubmit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    await screen.findByRole("button", { name: "Done" });
    rerender(<Footer question_attempt_id={42} onSubmit={submit} timerExpired />);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1));
    expect(submit).not.toHaveBeenCalled();
    await act(async () => upload.resolve({ saved: true, questionAttemptId: 42 }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });
  it("keeps a saved answer when feedback fails and offers feedback retry", async () => {
    mocks.analyze.mockRejectedValueOnce(Error("provider"));
    render(<Footer question_attempt_id={42} />);
    await record();
    await screen.findByRole("button", { name: "Retry feedback" });
    expect(screen.getByText("Answer saved.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });
});

it("ignores late attempt responses for a previous question and exposes retry", async () => {
  const first = deferred<{ questionAttemptId: number }>();
  const start = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValue({ questionAttemptId: 200 });
  const { result, rerender } = renderHook(({ id }) => useQuestionAttempt(1, id, start), {
    initialProps: { id: 10 },
  });
  rerender({ id: 11 });
  await waitFor(() => expect(result.current.failed).toBe(true));
  await act(async () => first.resolve({ questionAttemptId: 100 }));
  expect(result.current.id).toBeUndefined();
  await act(() => result.current.retry());
  expect(result.current.id).toBe(200);
});

it("surfaces an unusable interview id as a failure instead of pending forever", async () => {
  const start = vi.fn();
  const { result } = renderHook(() => useQuestionAttempt(Number("/interview"), 10, start));
  await waitFor(() => expect(result.current.failed).toBe(true));
  expect(result.current.pending).toBe(false);
  expect(result.current.id).toBeUndefined();
  expect(start).not.toHaveBeenCalled();
});

it("stays pending without failing while the question list is still loading", () => {
  const start = vi.fn();
  const { result } = renderHook(() => useQuestionAttempt(1, undefined, start));
  expect(result.current.pending).toBe(true);
  expect(result.current.failed).toBe(false);
  expect(start).not.toHaveBeenCalled();
});
