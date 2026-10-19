"use client";

import Link from "next/link";

// Compatibility for old report/bookmark links. Reusing a completed sitting's ID
// and browser-cached questions is not a new attempt and cannot unlock assessment.
export default function ReAttemptInterview() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 rounded-3xl border border-[#DEE8FB] bg-white p-5 text-[#1F285B] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#344499]">
        Keep practising
      </p>
      <h1 className="text-3xl font-bold">Start a fresh practice round</h1>
      <p>
        A completed interview keeps its original questions, answers and result. Choose a new
        practice round to keep improving. Formal assessments can only be joined through their
        published assessment setup.
      </p>
      <p className="text-sm text-gray-600">
        For a saved round that is still open, use its continuation option in History.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-12 items-center rounded-xl bg-black px-5 py-3 font-semibold text-white"
          href="/interview-start?mode=practice"
        >
          Set up practice
        </Link>
        <Link
          className="inline-flex min-h-12 items-center rounded-xl border border-[#344499] px-5 py-3 font-semibold"
          href="/history"
        >
          View history
        </Link>
      </div>
    </main>
  );
}
