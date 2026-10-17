import type { OverallScoreSummaryProps } from "./types";

type Dimension = OverallScoreSummaryProps["speechAndStructure"];

function ScoreDimension({ title, dimension }: { title: string; dimension: Dimension }) {
  return (
    <section className="rounded-2xl bg-[#F9FAFB] p-5" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#111827]">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">
            {dimension.score} of {dimension.maxScore} points
          </p>
        </div>
        <p className="text-3xl font-bold text-[#1F285B]">{dimension.percentage}%</p>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-[#E6ECFB]"
        role="progressbar"
        aria-label={`${title} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={dimension.percentage}
      >
        <div
          className="h-full rounded-full bg-[#344499]"
          style={{ width: `${Math.max(0, Math.min(100, dimension.percentage))}%` }}
        />
      </div>
      <dl className="mt-4 flex flex-wrap gap-2">
        {Object.entries(dimension.criteria).map(([key, value]) => (
          <div key={key} className="rounded-full border border-[#D6E0FB] bg-white px-3 py-1.5">
            <dt className="inline text-xs capitalize text-gray-600">{key}: </dt>
            <dd className="inline text-xs font-bold text-[#1F285B]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function OverallScoreSummary({
  knowledgeCompetence,
  speechAndStructure,
}: OverallScoreSummaryProps) {
  return (
    <section
      className="rounded-3xl border border-[#D6E0FB] bg-white p-5 sm:p-6"
      aria-labelledby="score-summary-title"
    >
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#344499]">
        Evaluated answers only
      </p>
      <h2 id="score-summary-title" className="mt-2 text-2xl font-bold">
        Coaching scores
      </h2>
      <p className="mt-1 text-gray-600">
        These scores reflect the evidence shown below. They are not a hiring decision.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {knowledgeCompetence && (
          <ScoreDimension title="Knowledge and relevance" dimension={knowledgeCompetence} />
        )}
        <ScoreDimension title="Speech and structure" dimension={speechAndStructure} />
      </div>
    </section>
  );
}
