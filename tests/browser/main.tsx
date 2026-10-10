import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookiesProvider } from "react-cookie";
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
      <Fixture />
    </CookiesProvider>
  </QueryClientProvider>
);
