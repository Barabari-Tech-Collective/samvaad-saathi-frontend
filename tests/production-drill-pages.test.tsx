import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Pacing from "@/app/(protected)/control-your-pace/practice/page";
import AnswerStep from "@/app/(protected)/structure-your-answer/interview/_components/AnswerTypeStep";
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: "test-account" } }),
}));
const f = vi.hoisted(() => ({
  level: "1",
  create: vi.fn(),
  submit: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  resample: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: f.push, replace: f.replace }),
  useSearchParams: () => new URLSearchParams({ level: f.level }),
}));
vi.mock("@/hooks/useMicPermission", () => ({
  useMicPermission: () => ({ hasPermission: true }),
  MicPermissionModal: () => null,
}));
vi.mock("@/lib/audio-utils", () => ({
  AUDIO_CONSTRAINTS_16KHZ: {},
  resampleAudioTo16kHz: f.resample,
  cleanupAudioAnalysis: vi.fn(),
  createAudioAnalysisContext: () => {
    throw new Error("unavailable");
  },
  startWaveformAnimation: vi.fn(),
}));
vi.mock("@/lib/api-config/src/client", () => ({
  createApiClient: () => ({
    useMutation: ({ url }: { url: string }) => ({
      mutateAsync: url === "pacing-practice/session" ? f.create : f.submit,
      isPending: false,
    }),
  }),
}));
let stop: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;
let stream: MediaStream;
class Recorder {
  static last: Recorder;
  mimeType = "audio/mp4";
  state = "inactive";
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  constructor(public stream: MediaStream) {
    Recorder.last = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
  }
  finish() {
    this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/mp4" }) });
    this.onstop?.();
  }
}
const props = {
  questionText: "Describe a project",
  framework: "STAR",
  currentSection: "Situation",
  currentStep: 1,
  totalSteps: 4,
  practiceId: "1",
  questionIndex: 0,
  current_hint: "Set the scene",
  onComplete: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  f.create.mockReset();
  f.submit.mockReset();
  f.level = "1";
  f.create.mockResolvedValue({ sessionId: 1, promptText: "First prompt" });
  f.submit.mockResolvedValue({});
  f.resample.mockResolvedValue(new Blob(["wav"], { type: "audio/wav" }));
  stop = vi.fn();
  stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
});
afterEach(() => vi.unstubAllGlobals());
it.each(["0", "-1", "4", "Infinity", "1.5", "garbage"])(
  "does not request a pacing session for invalid level %s",
  (level) => {
    f.level = level;
    render(<Pacing />);
    expect(f.create).not.toHaveBeenCalled();
    expect(f.replace).toHaveBeenCalledWith("/control-your-pace/levels");
  }
);
it("does not put a slow previous-level response into a new pacing session", async () => {
  let first!: (data: unknown) => void;
  f.create
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          first = done;
        })
    )
    .mockResolvedValueOnce({ sessionId: 2, promptText: "Second prompt" });
  const view = render(<Pacing />);
  f.level = "2";
  view.rerender(<Pacing />);
  expect(await screen.findByText(/Second prompt/)).toBeVisible();
  await act(async () => first({ sessionId: 1, promptText: "Stale prompt" }));
  expect(screen.queryByText(/Stale prompt/)).toBeNull();
});
it("structured practice closes late microphone permission after leaving", async () => {
  let grant!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(
    new Promise((done) => {
      grant = done;
    })
  );
  const view = render(<AnswerStep {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Answer Situation" }));
  view.unmount();
  await act(async () => grant(stream));
  expect(stop).toHaveBeenCalled();
  expect(f.submit).not.toHaveBeenCalled();
});
it("structured practice stops tracks immediately, uses browser MIME and waits for final data", async () => {
  render(<AnswerStep {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Answer Situation" }));
  fireEvent.click(await screen.findByRole("button", { name: "Done" }));
  expect(stop).toHaveBeenCalled();
  expect(f.submit).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Answer Situation" })).toBeDisabled();
  await act(async () => Recorder.last.finish());
  await waitFor(() => expect(props.onComplete).toHaveBeenCalledOnce());
  expect(f.resample.mock.calls[0][0].type).toBe("audio/mp4");
  expect(f.submit).toHaveBeenCalledOnce();
});
it("structured practice ignores upload completion after the section changes", async () => {
  let uploaded!: (value: object) => void;
  f.submit.mockReturnValue(
    new Promise((done) => {
      uploaded = done;
    })
  );
  const view = render(<AnswerStep {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Answer Situation" }));
  fireEvent.click(await screen.findByRole("button", { name: "Done" }));
  await act(async () => Recorder.last.finish());
  view.rerender(<AnswerStep {...props} currentSection="Task" currentStep={2} />);
  await act(async () => uploaded({ nextSectionHint: "stale hint" }));
  expect(props.onComplete).not.toHaveBeenCalled();
  expect(screen.queryByText("stale hint")).toBeNull();
});

it("structured practice releases a failed recorder and offers another attempt", async () => {
  render(<AnswerStep {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Answer Situation" }));
  await screen.findByRole("button", { name: "Done" });
  act(() => Recorder.last.onerror?.());
  expect(stop).toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Recording stopped unexpectedly");
  expect(screen.getByRole("button", { name: "Answer Situation" })).toBeEnabled();
  expect(f.submit).not.toHaveBeenCalled();
});

it("reuses creation receipt after unmount and remount", async () => {
  const view = render(<Pacing />);
  await screen.findByText(/First prompt/);
  const first = f.create.mock.calls[0][0].clientRequestId;
  view.unmount();
  render(<Pacing />);
  await screen.findByText(/First prompt/);
  expect(f.create.mock.calls[1][0].clientRequestId).toBe(first);
});
it("recovers a completed session instead of presenting another recording prompt", async () => {
  f.create.mockResolvedValue({ sessionId: 77, status: "completed" });
  render(<Pacing />);
  await waitFor(() =>
    expect(f.replace).toHaveBeenCalledWith("/control-your-pace/report?sessionId=77")
  );
  expect(sessionStorage.getItem("pacing-create:test-account:1")).toBeNull();
});

it("shows a recoverable error without dispatch when session storage is unavailable", async () => {
  const originalStorage = sessionStorage;
  vi.stubGlobal("sessionStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("blocked");
    },
  });
  try {
    render(<Pacing />);
    expect(await screen.findByRole("alert")).toHaveTextContent("browser storage is unavailable");
    expect(f.create).not.toHaveBeenCalled();
  } finally {
    vi.stubGlobal("sessionStorage", originalStorage);
  }
});
it("reconciles a lost submission response before asking for another upload", async () => {
  f.submit.mockRejectedValue(new Error("response lost"));
  render(<Pacing />);
  await screen.findByText(/First prompt/);
  fireEvent.click(screen.getByRole("button", { name: "Start Recording" }));
  fireEvent.click(await screen.findByRole("button", { name: /^Stop$/ }));
  await act(async () => Recorder.last.finish());
  f.create.mockResolvedValue({ sessionId: 1, status: "completed" });
  fireEvent.click(await screen.findByRole("button", { name: "View Report" }));
  await waitFor(() => expect(f.push).toHaveBeenCalledWith("/control-your-pace/report?sessionId=1"));
  expect(f.submit).toHaveBeenCalledOnce();
});
