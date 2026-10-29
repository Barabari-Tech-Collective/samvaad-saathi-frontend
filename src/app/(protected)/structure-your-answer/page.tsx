"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { ROLE_OPTIONS } from "@/lib/constants";
import SkillLanding from "@/components/studio/SkillLanding";

export default function StructureYourAnswerPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState("");
  return (
    <SkillLanding
      title="Give your answer a clear shape."
      eyebrow="Answer structure"
      description="Practise turning what you know into an answer someone can follow. Choose a role to make the questions relevant to you."
      steps={[
        { title: "Choose your context", description: "Pick the role you want to practise for." },
        {
          title: "Follow a framework",
          description: "Use the question’s suggested structure to organise your answer.",
        },
        {
          title: "Review and try again",
          description: "Notice what was clear and what needs a stronger example.",
        },
      ]}
    >
      <fieldset>
        <legend className="font-semibold">Which role are you preparing for?</legend>
        <div className="studio-role-grid">
          {ROLE_OPTIONS.map((role) => (
            <button
              type="button"
              className="studio-choice"
              key={role}
              aria-pressed={selectedRole === role}
              onClick={() => setSelectedRole(role)}
            >
              {role}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="btn btn-neutral studio-wide-action"
        disabled={!selectedRole}
        onClick={() => {
          if (selectedRole)
            router.push(
              `/structure-your-answer/interview?role=${encodeURIComponent(selectedRole)}`
            );
        }}
      >
        Start practice <ArrowRightIcon className="size-4" aria-hidden="true" />
      </button>
    </SkillLanding>
  );
}
