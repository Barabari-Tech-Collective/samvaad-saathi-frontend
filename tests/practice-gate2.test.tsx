import GuidedSpeakingDrill, {
  type SpeakingDrillLevel,
} from "@/components/practice/GuidedSpeakingDrill";
import PracticePreflight from "@/components/practice/PracticePreflight";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { CookiesProvider } from "react-cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LEVELS: SpeakingDrillLevel[] = [
  {
    key: "beginner",
    label: "Beginner",
    example: "A short answer.",
    durationSeconds: 30,
    thinkSeconds: 5,
    prompts: ["Tell me about yourself."],
    checklist: ["I made one clear point"],
  },
  {
    key: "intermediate",
    label: "Intermediate",
    example: "An answer with proof.",
    durationSeconds: 60,
    thinkSeconds: 10,
    prompts: ["Explain one project."],
    checklist: ["I included proof"],
  },
  {
    key: "advanced",
    label: "Advanced",
    example: "An answer with a counterpoint.",
    durationSeconds: 90,
    thinkSeconds: 15,
    prompts: ["Defend a decision."],
    checklist: ["I considered another view"],
  },
];

function renderDrill() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CookiesProvider>
        <GuidedSpeakingDrill
          module="warm_up"
          storageKey="test:warm-up"
          eyebrow="First two minutes"
          title="Warm-up chat"
          description="Low-pressure practice."
          levels={LEVELS}
        />
      </CookiesProvider>
    </QueryClientProvider>
  );
}

describe("Gate 2 Practice audio-only contract", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps guided practice audio-only when microphone access is unavailable", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(Error("denied")) },
    });
    vi.stubGlobal("MediaRecorder", class {});
    renderDrill();

    expect(screen.queryByText("Type my answer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    expect(
      await screen.findByText(
        "We could not use your microphone. Allow microphone access in browser settings, then try again."
      )
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start practice" })).toBeEnabled();
  });

  it("does not allow Practice to start without microphone and playback checks", () => {
    const onStart = vi.fn();
    render(
      <PracticePreflight
        role="General interview"
        level="easy"
        questionCount={5}
        durationMinutes={15}
        isStarting={false}
        onBack={vi.fn()}
        onStart={onStart}
      />
    );

    expect(screen.getByRole("button", { name: "Start practice interview" })).toBeDisabled();
    expect(screen.queryByLabelText("Use typed answers")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check microphone" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Play test sound" })).toBeEnabled();
    expect(onStart).not.toHaveBeenCalled();
  });
});
