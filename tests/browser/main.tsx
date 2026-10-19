import { GuideFixture } from "./guide-fixture";
import "./workspace.css";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookiesProvider } from "react-cookie";
import { CoachingAssignments } from "@/components/practice/CoachingAssignments";
import GuidedSpeakingDrill from "@/components/practice/GuidedSpeakingDrill";
import Footer from "@/app/(protected)/interview/_components/Footer";

function Fixture() {
  const [finished, setFinished] = useState(false);
  return (
    <main>
      <h1>Interview answer recovery</h1>
      <p>Local test fixture: records audio in the browser; tests replace backend responses.</p>
      {finished ? (
        <h2>Next question</h2>
      ) : (
        <Footer question_attempt_id={42} onNext={() => setFinished(true)} />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}>
    <CookiesProvider>
      {location.search.includes("fixture=assignments") ? (
        <CoachingAssignments />
      ) : location.search.includes("fixture=drill") ? (
        <GuidedSpeakingDrill
          module="warm_up"
          storageKey="test-drill"
          eyebrow="Practice"
          title="Speaking follow-up"
          description="Practise your introduction"
          levels={[
            {
              key: "beginner",
              label: "Beginner",
              example: "Introduce yourself",
              durationSeconds: 60,
              thinkSeconds: 0,
              prompts: ["Tell me about yourself"],
              checklist: ["I explained my goal"],
            },
          ]}
        />
      ) : location.search.includes("fixture=guide") ? (
        <GuideFixture />
      ) : (
        <Fixture />
      )}
    </CookiesProvider>
  </QueryClientProvider>
);
