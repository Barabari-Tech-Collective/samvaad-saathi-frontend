import { confidenceCopy } from "@/lib/practice-report";
import type { ReportResponse } from "./types";

interface EvidenceSummaryProps {
  evidence: NonNullable<ReportResponse["evidenceSummary"]>;
}

export default function EvidenceSummary({ evidence }: EvidenceSummaryProps) {
  return (
    <section
      className="rounded-3xl border border-[#D6E0FB] bg-white p-5 sm:p-6"
      aria-labelledby="evidence-summary-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#344499]">
            Evidence used
          </p>
          <h2 id="evidence-summary-title" className="mt-2 text-xl font-bold text-[#111827]">
            {confidenceCopy(evidence.confidence)}
          </h2>
          <p className="mt-2 max-w-2xl leading-6 text-gray-600">{evidence.statusMessage}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[#1F285B]">
          {evidence.evaluatedAnswers} of {evidence.totalQuestions} answers evaluated
        </p>
      </div>
      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-[#EEF2FF]"
        role="progressbar"
        aria-label="Answers with reliable evidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={evidence.coveragePercentage}
      >
        <div
          className="h-full rounded-full bg-[#344499]"
          style={{ width: `${evidence.coveragePercentage}%` }}
        />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-[#F9FAFB] p-3">
          <dt className="text-xs text-gray-500">Saved</dt>
          <dd className="mt-1 text-lg font-bold">{evidence.savedAnswers}</dd>
        </div>
        <div className="rounded-2xl bg-[#F9FAFB] p-3">
          <dt className="text-xs text-gray-500">Clear enough</dt>
          <dd className="mt-1 text-lg font-bold">{evidence.usableAnswers}</dd>
        </div>
        <div className="rounded-2xl bg-[#F9FAFB] p-3">
          <dt className="text-xs text-gray-500">Evaluated</dt>
          <dd className="mt-1 text-lg font-bold">{evidence.evaluatedAnswers}</dd>
        </div>
      </dl>
    </section>
  );
}
