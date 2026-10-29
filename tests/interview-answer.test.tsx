import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useInterviewAnswer } from "@/hooks/useInterviewAnswer";
import { useQuestionAttempt } from "@/hooks/useQuestionAttempt";
import Footer from "@/app/(protected)/interview/_components/Footer";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  analyze: vi.fn(),
  retrySpeech: vi.fn(),
  convert: vi.fn(),
  analyzing: false,
  transcription: undefined as
    | {
        questionAttemptId: number;
        status: "pending" | "processing" | "transcribed" | "failed";
        isTerminal: boolean;
        saved: boolean;
        answerVersion: number;
        followUpQuestion?: {
          interviewQuestionId: number;
          questionAttemptId: number;
          parentQuestionId: number;
          text: string;
          strategy: string;
        };
      }
    | undefined,
}));
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
    useQuery: () => ({ data: mocks.transcription }),
    useMutation: ({ url }: { url: string }) => ({
      mutateAsync: url.includes("/retry")
        ? mocks.retrySpeech
        : url.includes("transcribe-whisper")
          ? mocks.upload
          : mocks.analyze,
      isPending: url.includes("analysis") ? mocks.analyzing : false,
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
  mocks.analyzing = false;
  mocks.transcription = undefined;
  window.sessionStorage.clear();
  mocks.convert.mockResolvedValue(new Blob(["wav"], { type: "audio/wav" }));
  mocks.upload.mockResolvedValue({ saved: true, questionAttemptId: 42 });
  mocks.analyze.mockResolvedValue({});
  mocks.retrySpeech.mockResolvedValue({
    questionAttemptId: 42,
    status: "pending",
    isTerminal: false,
    saved: true,
    answerVersion: 1,
  });
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
    // Still waiting just short of the timeout.
    await act(() => vi.advanceTimersByTimeAsync(4_000));
    expect(result.current.phase).toBe("requesting");
    await act(() => vi.advanceTimersByTimeAsync(1_500));
    await act(() => starting);
    expect(result.current.phase).toBe("idle");
    // An unanswered prompt must not be reported as a broken or denied microphone.
    expect(result.current.error).toContain("did not get microphone access yet");
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
  it("restores a locally saved recording after a reload and clears it after retry", async () => {
    const draft = new Blob(["locally saved answer"], { type: "audio/webm" });
    const store = {
      get: vi.fn().mockResolvedValue(draft),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInterviewAnswer({ save, draftKey: "attempt-42", draftStore: store })
    );
    await waitFor(() => expect(result.current.phase).toBe("failed"));
    expect(result.current.error).toContain("saved on this device");
    await act(() => result.current.retry());
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.delete).toHaveBeenCalledWith("attempt-42");
    expect(result.current.phase).toBe("saved");
  });
  it("keeps the server acknowledgement when local draft cleanup fails", async () => {
    const store = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockRejectedValue(Error("storage unavailable")),
    };
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInterviewAnswer({ save, draftKey: "attempt-42", draftStore: store })
    );
    await act(() => result.current.start());
    await act(() => result.current.stop());
    expect(result.current.phase).toBe("saved");
    expect(result.current.error).toBeNull();
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
  it("keeps a committed formal answer available without offering a re-record", () => {
    render(
      <Footer question_attempt_id={42} initiallyAnswered allowRerecord={false} onNext={vi.fn()} />
    );
    expect(screen.getByText("Answer saved.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Redo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });
  it("sends the active Practice session token with recorded answers", async () => {
    render(<Footer question_attempt_id={42} sessionLeaseToken="lease-token-1234567890" />);
    await record();
    await screen.findByText("Answer saved.");
    const body = mocks.upload.mock.calls[0][0] as FormData;
    expect(body.get("session_lease_token")).toBe("lease-token-1234567890");
  });
  it("restores a server-saved answer as ready to continue", () => {
    const next = vi.fn();
    render(
      <Footer question_attempt_id={42} initiallyAnswered initialAnswerVersion={3} onNext={next} />
    );
    expect(screen.getByText("Answer saved.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith("answer_saved", 3);
  });
  it("saves and exits only after the parent pause request succeeds", async () => {
    const pause = vi.fn().mockResolvedValue(undefined);
    render(<Footer question_attempt_id={42} onSaveAndExit={pause} />);
    fireEvent.click(screen.getByRole("button", { name: "Save and exit" }));
    await waitFor(() => expect(pause).toHaveBeenCalledTimes(1));
  });
  it("keeps the student on the interview when pausing fails", async () => {
    const pause = vi.fn().mockRejectedValue(Error("offline"));
    render(<Footer question_attempt_id={42} onSaveAndExit={pause} />);
    fireEvent.click(screen.getByRole("button", { name: "Save and exit" }));
    await screen.findByText(
      "We could not pause this interview. Your saved answers are safe. Check your connection and try again."
    );
    expect(screen.getByRole("button", { name: "Save and exit" })).toBeEnabled();
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
  it("lets the student continue when transcription fails after durable storage", async () => {
    mocks.upload.mockResolvedValueOnce({
      saved: true,
      questionAttemptId: 42,
      transcriptionStatus: "failed",
    });
    const next = vi.fn();
    render(<Footer question_attempt_id={42} onNext={next} />);
    await record();
    await screen.findByText(
      "Your answer is saved. Speech feedback is delayed, but you can continue safely."
    );
    expect(screen.getByRole("button", { name: "Retry speech feedback" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(next).toHaveBeenCalledTimes(1);
  });
  it("unblocks Next as soon as a recording is durable while speech feedback runs", async () => {
    mocks.upload.mockResolvedValueOnce({
      saved: true,
      questionAttemptId: 42,
      answerVersion: 1,
      transcriptionStatus: "pending",
    });
    const next = vi.fn();
    render(<Footer question_attempt_id={42} onNext={next} />);
    await record();
    await screen.findByText("Answer saved. Preparing speech feedback…");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(mocks.analyze).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(next).toHaveBeenCalledTimes(1);
  });
  it("explains the tradeoff before leaving an adaptive question still processing", async () => {
    mocks.upload.mockResolvedValueOnce({
      saved: true,
      questionAttemptId: 42,
      answerVersion: 1,
      transcriptionStatus: "processing",
    });
    const next = vi.fn();
    render(
      <Footer question_attempt_id={42} followUpStrategy="llm_transcription_based" onNext={next} />
    );
    await record();
    fireEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(
      screen.getByRole("heading", { name: "Continue before the follow-up is ready?" })
    ).toBeVisible();
    expect(next).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continue without follow-up" }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith("continue_without_follow_up", 1);
  });

  it("persists an explicit skip instead of advancing only in browser state", async () => {
    const next = vi.fn().mockResolvedValue(undefined);
    render(<Footer question_attempt_id={42} onNext={next} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Skip this question?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Yes, Skip" }));
    await waitFor(() => expect(next).toHaveBeenCalledWith("skip", undefined));
  });
  it("reattaches to background work and consumes a completed follow-up once", async () => {
    const onFollowUpQuestion = vi.fn();
    mocks.transcription = {
      questionAttemptId: 42,
      status: "transcribed",
      isTerminal: true,
      saved: true,
      answerVersion: 4,
      followUpQuestion: {
        interviewQuestionId: 70,
        questionAttemptId: 71,
        parentQuestionId: 10,
        text: "What did you learn from that incident?",
        strategy: "llm_transcription_based",
      },
    };
    const { rerender } = render(
      <Footer
        question_attempt_id={42}
        initiallyAnswered
        initialTranscriptionStatus="processing"
        onFollowUpQuestion={onFollowUpQuestion}
      />
    );
    await waitFor(() => expect(onFollowUpQuestion).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mocks.analyze).toHaveBeenCalledWith({
        question_attempt_id: 42,
        analysisTypes: ["domain", "communication", "pace", "pause"],
        answerVersion: 4,
      })
    );
    rerender(
      <Footer
        question_attempt_id={42}
        initiallyAnswered
        initialTranscriptionStatus="processing"
        onFollowUpQuestion={onFollowUpQuestion}
      />
    );
    expect(onFollowUpQuestion).toHaveBeenCalledTimes(1);
  });
  it("retries only speech feedback without re-uploading the saved recording", async () => {
    mocks.upload.mockResolvedValueOnce({
      saved: true,
      questionAttemptId: 42,
      answerVersion: 1,
      transcriptionStatus: "failed",
    });
    render(<Footer question_attempt_id={42} />);
    await record();
    fireEvent.click(await screen.findByRole("button", { name: "Retry speech feedback" }));
    await waitFor(() => expect(mocks.retrySpeech).toHaveBeenCalledTimes(1));
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    await screen.findByText("Answer saved. Preparing speech feedback…");
  });
  it("restores a failed speech job after refresh with a separate retry", async () => {
    render(
      <Footer question_attempt_id={42} initiallyAnswered initialTranscriptionStatus="failed" />
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry speech feedback" }));
    await waitFor(() => expect(mocks.retrySpeech).toHaveBeenCalledTimes(1));
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("does not block navigation while AI feedback is still processing", async () => {
    mocks.analyzing = true;
    const next = vi.fn();
    render(<Footer question_attempt_id={42} onNext={next} />);
    await record();
    await screen.findByText("Answer saved.");
    expect(screen.getByText("Answer saved. Preparing feedback…")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(next).toHaveBeenCalledTimes(1);
  });
  it("does not expose or restore typed answers", () => {
    window.sessionStorage.setItem(
      "practice-text-answer:42",
      "My connection dropped, but this draft survived."
    );
    render(<Footer question_attempt_id={42} />);
    expect(screen.queryByRole("button", { name: "Type answer instead" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Answer" })).toBeEnabled();
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

it("does not disable Answer and Next together while waiting for the microphone", async () => {
  const permission = deferred<MediaStream>();
  vi.spyOn(navigator.mediaDevices, "getUserMedia").mockReturnValue(permission.promise);
  render(<Footer question_attempt_id={7} onNext={() => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: /Answer/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Answer/ })).toBeDisabled());
  // The permission prompt has captured no audio, so there is nothing to protect
  // and the student must still be able to move on.
  expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
});

it("abandons a pending microphone request when the student moves on", async () => {
  const track = { stop: vi.fn() };
  const permission = deferred<MediaStream>();
  vi.spyOn(navigator.mediaDevices, "getUserMedia").mockReturnValue(permission.promise);
  const onNext = vi.fn();
  render(<Footer question_attempt_id={7} onNext={onNext} />);
  fireEvent.click(screen.getByRole("button", { name: /Answer/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Answer/ })).toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  // Answer is released rather than latched off for the whole permission timeout.
  await waitFor(() => expect(screen.getByRole("button", { name: /Answer/ })).toBeEnabled());
  // A late grant must be released, not turned into a recording on a skipped question.
  await act(async () => permission.resolve({ getTracks: () => [track] } as unknown as MediaStream));
  expect(track.stop).toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Listening…" })).toBeNull();
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

it("reuses one client attempt id across retries", async () => {
  const start = vi.fn().mockRejectedValueOnce(Error("offline")).mockResolvedValue({
    questionAttemptId: 77,
  });
  const { result } = renderHook(() => useQuestionAttempt(5, 9, start));
  await waitFor(() => expect(result.current.failed).toBe(true));
  await act(() => result.current.retry());
  const firstId = start.mock.calls[0][0].clientAttemptId;
  const secondId = start.mock.calls[1][0].clientAttemptId;
  expect(firstId).toBe(secondId);
  expect(firstId).toContain("practice-5-9-");
});

it("uses the server attempt checkpoint without creating a duplicate attempt", async () => {
  const start = vi.fn();
  const { result } = renderHook(() => useQuestionAttempt(5, 9, start, 123));
  await waitFor(() => expect(result.current.id).toBe(123));
  expect(result.current.pending).toBe(false);
  expect(start).not.toHaveBeenCalled();
});

it("sends the Practice session token when creating a question attempt", async () => {
  const start = vi.fn().mockResolvedValue({ questionAttemptId: 77 });
  const { result } = renderHook(() =>
    useQuestionAttempt(5, 9, start, null, "lease-token-1234567890")
  );
  await waitFor(() => expect(result.current.id).toBe(77));
  expect(start).toHaveBeenCalledWith(
    expect.objectContaining({ sessionLeaseToken: "lease-token-1234567890" })
  );
});

it("does not create an attempt until the Practice session is writable", async () => {
  const start = vi.fn().mockResolvedValue({ questionAttemptId: 77 });
  const { result, rerender } = renderHook(
    ({ enabled }) => useQuestionAttempt(5, 9, start, null, null, enabled),
    { initialProps: { enabled: false } }
  );
  expect(result.current.pending).toBe(true);
  expect(start).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(result.current.id).toBe(77));
  expect(start).toHaveBeenCalledTimes(1);
});

it('ignores a late lease conflict from a previous question', async () => {
  const first = deferred<{ questionAttemptId: number }>();
  const conflict = vi.fn();
  const start = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({ questionAttemptId: 200 });
  const { result, rerender } = renderHook(({ id }) => useQuestionAttempt(1, id, start, null, 'lease', true, conflict), { initialProps: { id: 10 } });
  rerender({ id: 11 });
  await waitFor(() => expect(result.current.id).toBe(200));
  await act(async () => first.reject(Object.assign(new Error('conflict'), {response:{data:{detail:{code:'SESSION_LEASE_REPLACED'}}}})));
  expect(conflict).not.toHaveBeenCalled();
  expect(result.current.id).toBe(200);
});

it('ignores a late lease conflict after the interview view unmounts', async () => {
  const pending = deferred<{ questionAttemptId: number }>();
  const conflict = vi.fn();
  const { unmount } = renderHook(() => useQuestionAttempt(1, 10, () => pending.promise, null, 'lease', true, conflict));
  unmount();
  await act(async () => pending.reject(Object.assign(new Error('conflict'), {response:{data:{detail:{code:'SESSION_LEASE_EXPIRED'}}}})));
  expect(conflict).not.toHaveBeenCalled();
});
