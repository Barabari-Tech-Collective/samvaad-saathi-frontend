import { questionEvidenceCopy } from "@/lib/practice-report";
import type { PerQuestionAnalysisProps, QuestionEvidenceStatus } from "./types";

const badgeClasses = (status: QuestionEvidenceStatus | undefined): string => {
  switch (status) {
    case "evaluated":
      return "bg-emerald-50 text-emerald-800";
    case "needs_review":
      return "bg-blue-50 text-blue-800";
    case "insufficient":
    case "unavailable":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function PerQuestionAnalysis({ questionAnalysis }: PerQuestionAnalysisProps) {
  return (
    <section className="space-y-3" id="per-question-analysis" aria-labelledby="answer-review-title">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#344499]">
          Your evidence
        </p>
        <h2 id="answer-review-title" className="mt-2 text-2xl font-bold">
          Review each answer
        </h2>
        <p className="mt-1 text-gray-600">
          The transcript is the observation. Coaching is shown separately and only when evidence is
          usable.
        </p>
      </div>

      {questionAnalysis.map((question, index) => {
        const status = question.evidence?.status;
        return (
          <details key={question.id} className="group rounded-2xl border border-[#D6E0FB] bg-white">
            <summary className="flex min-h-16 cursor-pointer list-none items-start justify-between gap-4 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#344499]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">
                    Question {index + 1} of {question.totalQuestions}
                  </span>
                  <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#344499]">
                    {question.type}
                  </span>
                  {status && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(status)}`}
                    >
                      {questionEvidenceCopy(status)}
                    </span>
                  )}
                </div>
                <p className="mt-3 font-semibold leading-6 text-[#111827]">{question.question}</p>
              </div>
              <span
                className="mt-1 text-xl text-[#344499] transition group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>

            <div className="space-y-5 border-t border-[#EEF2FF] px-5 py-5">
              {question.evidence?.observation && (
                <div className="rounded-2xl bg-[#F9FAFB] p-4">
                  <h3 className="font-semibold">What we observed</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {question.evidence.observation}
                  </p>
                </div>
              )}

              {question.transcript && (
                <div>
                  <h3 className="font-semibold">Your answer transcript</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                    {question.transcript}
                  </p>
                </div>
              )}

              {question.feedback ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {question.feedback.strengths && (
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <h3 className="font-semibold text-emerald-900">What worked</h3>
                      <p className="mt-2 text-sm leading-6 text-emerald-950">
                        {question.feedback.strengths}
                      </p>
                    </div>
                  )}
                  {question.feedback.areasOfImprovement && (
                    <div className="rounded-2xl bg-[#FFF5E8] p-4">
                      <h3 className="font-semibold text-amber-950">One way to improve</h3>
                      <p className="mt-2 text-sm leading-6 text-amber-950">
                        {question.feedback.areasOfImprovement}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4" role="status">
                  <h3 className="font-semibold text-amber-950">No score was inferred</h3>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    {question.evidence?.uncertainty ??
                      "This answer did not contain enough reliable evidence for coaching."}
                  </p>
                </div>
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
}
