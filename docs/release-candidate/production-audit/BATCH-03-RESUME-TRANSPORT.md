# Batch 03 — Résumé transport account ownership

22 October 2026. Local code checkpoint; no deployment.

## Completed

- [x] PDF requests accept the initiating page account revision and reject stale dispatch/results.
- [x] Downloaded PDF blobs retain their account revision in a WeakMap; a later save cannot silently upload them under a different account.
- [x] Final-page download/save checks ownership before download, upload, refresh and success feedback. Errors from an old account are ignored.
- [x] Delayed template-generation callbacks are ignored after effect cleanup or account changes; raw exception logging removed from that callback.
- [x] Save notification IDs are account-revision-specific.
- [x] Regression cases: delayed PDF response, account switch between download and upload, delayed save acknowledgement, same-account token renewal, and page-level account switch during preparation.

## Verification

368 tests across 34 files pass. TypeScript no-emit passes. Optimized webpack build passes (35 static outputs). Release lint passes with the pre-existing useQuestionAttempt cleanup-ref warning. The final page and document service are outside the existing release lint allowlist; they are typechecked and exercised by component/service tests. No browser tests were run.

## Remaining

02a remains open for profile, onboarding, hygiene, direct AI résumé analysis and other imperative callbacks. 02b browser/tab/bfcache acceptance remains pending because browser access is disabled. These client guards cannot undo a request the server already accepted for the initiating account. Backend authorization remains the security boundary. This batch does not claim complete account isolation or production acceptance.
