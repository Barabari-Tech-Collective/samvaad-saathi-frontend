import type { FinalSummaryProps } from "./types";

export default function FinalSummary({ speechFluencyFeedback }: FinalSummaryProps) {
  return (
    <section
      className="rounded-3xl border border-[#D6E0FB] bg-white p-5 sm:p-6"
      aria-labelledby="communication-summary-title"
    >
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#344499]">
        AI-supported interpretation
      </p>
      <h2 id="communication-summary-title" className="mt-2 text-2xl font-bold">
        Communication coaching
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        {speechFluencyFeedback.ratingTitle}: {speechFluencyFeedback.ratingDescription}
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {speechFluencyFeedback.strengths && (
          <div className="rounded-2xl bg-emerald-50 p-5">
            <h3 className="font-bold text-emerald-950">What worked</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-emerald-950">
              {speechFluencyFeedback.strengths}
            </p>
          </div>
        )}
        {speechFluencyFeedback.areasOfImprovement && (
          <div className="rounded-2xl bg-[#FFF5E8] p-5">
            <h3 className="font-bold text-amber-950">What to try next</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-950">
              {speechFluencyFeedback.areasOfImprovement}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
