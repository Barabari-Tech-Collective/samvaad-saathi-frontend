import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import SkillLanding from "@/components/studio/SkillLanding";

export default function ControlYourPacePage() {
  return (
    <SkillLanding
      title="Find a pace that feels natural."
      eyebrow="Pace & pauses"
      description="Give your ideas room to land. Practise speaking steadily, leaving pauses and noticing filler words."
      steps={[
        {
          title: "Choose a level",
          description: "Start with a short exercise or take on a longer response.",
        },
        {
          title: "Speak out loud",
          description: "Record your answer at a pace that feels comfortable.",
        },
        {
          title: "Listen and adjust",
          description: "Use your feedback to try a clearer, steadier answer.",
        },
      ]}
    >
      <h2>Make yourself easier to follow</h2>
      <p className="studio-muted">
        You don’t need to speak faster to sound confident. A pause gives you time to think and gives
        your listener time to understand.
      </p>
      <div className="my-6 border-y border-[var(--studio-line)] py-5 text-sm studio-muted">
        You’ll need a microphone and a quiet place to speak.
      </div>
      <Link href="/control-your-pace/levels" className="btn btn-neutral studio-wide-action">
        Choose your level <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </SkillLanding>
  );
}
