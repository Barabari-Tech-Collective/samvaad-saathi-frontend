"use client";

import { createApiClient, extractApiErrorMessage } from "@/lib/api-config";
import { APIService } from "@/lib/api-config/src/config";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import toast from "react-hot-toast";

const practiceApiClient = createApiClient(APIService.INTERVIEWS);
const CONSENT_URL = "v2/practice-dashboard/consents/me";
const POLICY_VERSION = "practice-sharing-v1";

type ConsentPurpose = "facilitator_coaching" | "opportunity_readiness";

interface PracticeConsent {
  purpose: ConsentPurpose;
  granted: boolean;
  policy_version: string | null;
  expires_at: string | null;
  updated_at: string | null;
}

interface ConsentOption {
  purpose: ConsentPurpose;
  title: string;
  description: string;
  shared: string;
}

const CONSENT_OPTIONS: ConsentOption[] = [
  {
    purpose: "facilitator_coaching",
    title: "Let my facilitator support my practice",
    description:
      "Your assigned facilitator can see progress, coaching summaries and completed drills to suggest what to practise next.",
    shared: "No raw audio or full transcript is shared in the dashboard.",
  },
  {
    purpose: "opportunity_readiness",
    title: "Consider me for relevant opportunities",
    description:
      "The placements team can see recent, relevant practice evidence when preparing a human-reviewed shortlist.",
    shared:
      "No automatic selection happens. Missing evidence is shown as missing—not as a low score.",
  },
];

export default function PracticeConsentCard() {
  const [pendingPurpose, setPendingPurpose] = useState<ConsentPurpose | null>(null);
  const consents = practiceApiClient.useQuery<PracticeConsent[]>({
    key: [CONSENT_URL],
    url: CONSENT_URL,
    options: { staleTime: 30_000 },
  });
  const updateConsent = practiceApiClient.useMutation<
    { purpose: ConsentPurpose; granted: boolean; updated_at: string },
    {
      purpose: ConsentPurpose;
      granted: boolean;
      policy_version: string;
    }
  >({
    url: CONSENT_URL,
    method: "put",
    keyToInvalidate: { queryKey: [CONSENT_URL] },
    showToastError: false,
  });

  const byPurpose = new Map((consents.data ?? []).map((consent) => [consent.purpose, consent]));

  const toggle = async (purpose: ConsentPurpose, granted: boolean) => {
    setPendingPurpose(purpose);
    try {
      await updateConsent.mutateAsync({
        purpose,
        granted,
        policy_version: POLICY_VERSION,
      });
      toast.success(
        granted
          ? "Your sharing choice was saved."
          : "Consent withdrawn. New staff access is now blocked."
      );
    } catch (error) {
      toast.error(extractApiErrorMessage(error, "Your choice was not saved. Please try again."));
    } finally {
      setPendingPurpose(null);
    }
  };

  return (
    <section className="my-5 rounded-2xl border border-primary/15 bg-base-100 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <ShieldCheckIcon className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold">Practice sharing choices</h3>
          <p className="mt-1 text-sm text-base-content/65">
            You decide who may use your Practice interview results and why. Both choices start off
            and can be changed at any time.
          </p>
        </div>
      </div>

      {consents.isLoading ? (
        <div className="mt-4 space-y-3" aria-label="Loading sharing choices">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : consents.isError ? (
        <div className="alert alert-warning mt-4 text-sm">
          Your sharing choices could not be loaded. Nothing new will be shared until this screen is
          available again.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {CONSENT_OPTIONS.map((option) => {
            const granted = byPurpose.get(option.purpose)?.granted ?? false;
            const pending = pendingPurpose === option.purpose;
            return (
              <div key={option.purpose} className="rounded-xl border border-base-300 p-3">
                <div className="flex items-start justify-between gap-4">
                  <label htmlFor={`consent-${option.purpose}`} className="min-w-0">
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-base-content/65">
                      {option.description}
                    </span>
                  </label>
                  <input
                    id={`consent-${option.purpose}`}
                    type="checkbox"
                    className="toggle toggle-primary mt-1 shrink-0"
                    checked={granted}
                    disabled={pending || updateConsent.isPending}
                    onChange={(event) => void toggle(option.purpose, event.target.checked)}
                    aria-describedby={`consent-help-${option.purpose}`}
                  />
                </div>
                <p
                  id={`consent-help-${option.purpose}`}
                  className="mt-2 text-xs font-medium text-primary/80"
                >
                  {option.shared}
                </p>
                <p className="mt-2 text-xs text-base-content/50" aria-live="polite">
                  {pending ? "Saving…" : granted ? "Currently allowed" : "Currently off"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-base-content/55">
        Withdrawing consent blocks future dashboard access. Records already included in a locked,
        approved shortlist remain auditable, but cannot be newly exported or reused after consent is
        withdrawn.
      </p>
    </section>
  );
}
