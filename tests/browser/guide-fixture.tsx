import { useEffect, useState } from "react";
import { WorkspaceGuide } from "@/components/guides/WorkspaceGuide";
export function GuideFixture() {
  const [role, setRole] = useState("student");
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    const revoke = () => setAllowed(false);
    const switchRole = () => setRole("facilitator");
    window.addEventListener("guide-test-revoke", revoke);
    window.addEventListener("guide-test-role", switchRole);
    return () => {
      window.removeEventListener("guide-test-revoke", revoke);
      window.removeEventListener("guide-test-role", switchRole);
    };
  }, []);
  return (
    <main>
      <h1>Guide browser fixture</h1>
      <label>
        Your work <input aria-label="Your work" />
      </label>
      <a href="#next" id="practice-target">
        Practice
      </a>
      <WorkspaceGuide
        storageKey={`browser-guide-v1:${role}`}
        steps={
          allowed
            ? [
                {
                  title: "Start with practice",
                  body: "Use practice to improve one skill at a time.",
                  target: "#practice-target",
                },
                {
                  title: "Saved progress",
                  body: "Answers remain saved when you return.",
                  target: "#missing-target",
                },
              ]
            : []
        }
      />
    </main>
  );
}
