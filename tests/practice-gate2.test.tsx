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

describe("Gate 2 Practice fallbacks", () => {
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

  it("lets a student complete the guided flow without microphone access", () => {
    renderDrill();

    fireEvent.click(screen.getByLabelText("Type my answer"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "I am a student who enjoys solving real community problems." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review typed answer" }));

    expect(
      screen.getByRole("heading", { name: "Review one thing before you finish" })
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Complete this practice" })).toBeEnabled();
  });

  it("allows typed Practice after connection and storage checks without voice checks", () => {
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
    fireEvent.click(screen.getByLabelText("Use typed answers"));
    const start = screen.getByRole("button", { name: "Start practice interview" });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledOnce();
  });
});
