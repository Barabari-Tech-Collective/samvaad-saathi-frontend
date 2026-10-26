import GuidedSpeakingDrill, {
  type SpeakingDrillLevel,
} from "@/components/practice/GuidedSpeakingDrill";

const LEVELS: SpeakingDrillLevel[] = [
  {
    key: "beginner",
    label: "Beginner",
    example: "30 seconds on a familiar topic.",
    durationSeconds: 30,
    thinkSeconds: 10,
    prompts: [
      "Describe a skill you enjoy learning.",
      "Describe a place in your college that matters to you.",
      "Explain one habit that helps you study.",
    ],
    checklist: [
      "I started with one clear point",
      "I added one detail or example",
      "I completed my thought",
    ],
  },
  {
    key: "intermediate",
    label: "Intermediate",
    example: "60 seconds on a random topic.",
    durationSeconds: 60,
    thinkSeconds: 15,
    prompts: [
      "Should every student learn basic financial literacy?",
      "How can technology improve life in a small town?",
      "What makes teamwork succeed?",
    ],
    checklist: [
      "I stated my position early",
      "I supported it with a reason",
      "I used a clear ending",
    ],
  },
  {
    key: "advanced",
    label: "Advanced",
    example: "90 seconds with a counterpoint.",
    durationSeconds: 90,
    thinkSeconds: 15,
    prompts: [
      "Remote work creates more opportunity than it removes. Give your view and address one opposing view.",
      "AI will improve entry-level careers. Give your view and address one risk.",
      "College projects matter more than marks for employability. Discuss both sides and conclude.",
    ],
    checklist: [
      "I made my position clear",
      "I supported it with evidence or an example",
      "I considered another view",
      "I finished with a conclusion",
    ],
  },
];

export default function ThinkFastPage() {
  return (
    <GuidedSpeakingDrill
      module="think_fast"
      storageKey="samvaad:drill:think-fast:last-completion"
      eyebrow="Improvisation practice"
      title="Think fast"
      description="Practise organising your thoughts without mentally translating a full answer first. The goal is continuity and clarity, not perfect English."
      levels={LEVELS}
    />
  );
}
