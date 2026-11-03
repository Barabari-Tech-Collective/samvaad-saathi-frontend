"use client";

import PageHeading from "@/components/studio/PageHeading";
import { apiClient } from "@/lib/api-config";
import { parseOpportunityOutcomes } from "@/lib/opportunity-outcomes";
export function OpportunityOutcomes({ accountKey }: { accountKey: string }) {
  const query = apiClient.useQuery<unknown>({
    url: "v2/opportunities/me/outcomes",
    key: ["opportunity-outcomes", accountKey],
    options: { staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true },
  });
  const outcomes = query.isError ? null : parseOpportunityOutcomes(query.data);
  const invalidResponse =
    !query.isError && !query.isLoading && query.data !== undefined && !outcomes;
  return (
    <section
      className="mx-auto w-full max-w-4xl space-y-6 py-6"
      aria-label="Your opportunity outcomes"
    >
      <PageHeading
        eyebrow="Placement updates"
        title="Your opportunity outcomes"
        description="Read the outcomes your placement team has released, along with feedback and your next step."
        action={
          <button
            className="ws-button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh outcomes
          </button>
        }
      />
      {query.isError || invalidResponse ? (
        <div role="alert" className="studio-panel">
          <p>
            Your outcomes could not be verified. Check your connection and sign-in, then refresh.
          </p>
        </div>
      ) : query.isLoading || outcomes === null ? (
        <output>Checking your released outcomes…</output>
      ) : !outcomes.length ? (
        <div className="studio-panel">
          <h2>No released outcomes yet</h2>
          <p>
            Your placement team will publish an outcome here when it is ready. An empty list does
            not mean rejection.
          </p>
        </div>
      ) : (
        <ul className="space-y-5">
          {outcomes.map((item) => (
            <li
              className="studio-panel space-y-3 break-words"
              key={`${item.opportunityId}:${item.revision}`}
            >
              <p>{item.organisation}</p>
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="font-medium">
                {item.decision === "include"
                  ? "Shortlisted"
                  : "Not shortlisted for this opportunity"}
              </p>
              <p className="text-sm">
                Released {new Date(item.releasedAt).toLocaleString()} · Revision {item.revision}
              </p>
              <div>
                <h3 className="font-medium">Feedback</h3>
                <p className="whitespace-pre-wrap">{item.feedback}</p>
              </div>
              <div>
                <h3 className="font-medium">Next step</h3>
                <p className="whitespace-pre-wrap">{item.nextStep}</p>
              </div>
              <p className="text-sm">
                For questions about this outcome, contact your placement team.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
