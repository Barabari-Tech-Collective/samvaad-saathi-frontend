import GuidedSpeakingDrill, {
  type SpeakingDrillLevel,
} from "@/components/practice/GuidedSpeakingDrill";

const LEVELS: SpeakingDrillLevel[] = [
  {
    key: "beginner",
    label: "Beginner",
    example: "A clear 30-second introduction.",
    durationSeconds: 30,
    thinkSeconds: 10,
    prompts: [
      "Tell me about yourself in three parts: who you are, what you can do, and what you want next.",
    ],
    checklist: [
      "I introduced myself clearly",
      "I named one useful skill",
      "I ended with what I want next",
    ],
  },
  {
    key: "intermediate",
    label: "Intermediate",
    example: "A two-minute introduction with proof.",
    durationSeconds: 120,
    thinkSeconds: 15,
    prompts: [
      "Walk me through your background and use one project or experience to show what you are good at.",
    ],
    checklist: [
      "My story had a clear order",
      "I included evidence, not only claims",
      "I connected my background to the role",
    ],
  },
  {
    key: "advanced",
    label: "Advanced",
    example: "Introduction, motivation and a follow-up.",
    durationSeconds: 120,
    thinkSeconds: 15,
    prompts: [
      "Tell me about yourself, why this kind of role interests you, and which experience best prepares you for it.",
    ],
    checklist: [
      "I answered all three parts",
      "My strongest proof was specific",
      "My motivation sounded genuine and role-relevant",
    ],
  },
];

export default function WarmUpChatPage() {
  return (
    <GuidedSpeakingDrill
      module="warm_up"
      storageKey="samvaad:drill:warm-up:last-completion"
      eyebrow="First two minutes"
      title="Warm-up chat"
      description="Practise the opening of an interview in a low-pressure space. Build a reusable introduction before handling harder questions."
      levels={LEVELS}
    />
  );
}
