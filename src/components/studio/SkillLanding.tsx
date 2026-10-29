import type { ReactNode } from "react";
import PageHeading from "./PageHeading";
import VoiceMark from "./VoiceMark";

export default function SkillLanding({
  title,
  description,
  eyebrow = "Skill practice",
  steps,
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  steps: { title: string; description: string }[];
  children: ReactNode;
}) {
  return (
    <div className="studio-skill-landing">
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="studio-skill-layout">
        <section className="studio-panel studio-skill-setup" aria-label={`${title} setup`}>
          {children}
        </section>
        <aside className="studio-skill-method" aria-label="How this practice works">
          <VoiceMark />
          <h2>How this practice works</h2>
          <ol>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
