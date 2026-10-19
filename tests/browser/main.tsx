import ActivePage from "@/app/(protected)/interview/page";
import StartPage from "@/app/(protected)/interview-start/page";
import ReattemptPage from "@/app/(protected)/reattempt-interview/page";
import CompletedPage from "@/app/(protected)/interview-completed/page";
import HistoryPage from "@/app/(protected)/history/page";
import ReportPage from "@/app/(protected)/report-summary/page";
import PracticePage from "@/app/(protected)/practice/page";
import { AssessmentFixture } from "./assessment-fixture";
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
const client = new QueryClient();
window.addEventListener("completion-test-refresh", () => {
  void client.invalidateQueries({ queryKey: ["completion-status"] });
});
window.addEventListener("history-test-refresh", () => {
  void client.invalidateQueries({ queryKey: ["interview-history"] });
});
window.addEventListener("report-test-refresh", () => {
  void client.invalidateQueries({ queryKey: ["practice-report"] });
});
window.addEventListener("practice-test-refresh", () => {
  void client.invalidateQueries({ queryKey: ["practice/hub"] });
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <CookiesProvider>
      {location.search.includes("fixture=active") ? (
        <ActivePage />
      ) : location.search.includes("fixture=assessment") ? (
        <AssessmentFixture />
      ) : location.search.includes("fixture=start") ? (
        <main className="p-4">
          <StartPage />
        </main>
      ) : location.search.includes("fixture=reattempt") ? (
        <main className="p-4">
          <ReattemptPage />
        </main>
      ) : location.search.includes("fixture=completed") ? (
        <main className="p-4">
          <CompletedPage />
        </main>
      ) : location.search.includes("fixture=history") ? (
        <main className="p-4 sm:p-6">
          <HistoryPage />
        </main>
      ) : location.search.includes("fixture=report") ? (
        <ReportPage />
      ) : location.search.includes("fixture=practice-hub") ? (
        <main className="p-4 sm:p-6">
          <PracticePage />
        </main>
      ) : location.search.includes("fixture=assignments") ? (
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
