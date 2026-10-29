# Batch 06 — Confirm the actual résumé extraction receipt

23 October 2026. Local frontend changes; backend inspected read-only, no deployment.

## Finding

POST /extract-resume runs extraction and profile persistence before returning its 202 response. The response exposes saved and camel-cased textLength; saved can be false despite HTTP success. Original file storage is a separate background task. Polling /me.hasResume can therefore observe an older résumé, and previously both UI loops proceeded after exhausting retries.

## Completed

- [x] Profile and onboarding validate saved === true and positive integer textLength for the specific extraction response instead of polling a generic account flag.
- [x] Missing/malformed receipts, explicit persistence failure and empty extracted text block continuation and retain the chosen file.
- [x] Removed unconditional upload-success messages from the mutation configuration. Feedback says résumé data was saved and the original file may appear later.
- [x] Onboarding remembers the confirmed File object for the mounted page so retrying the subsequent profile step does not repeat extraction. A different File requires its own receipt.
- [x] 13 new test cases cover receipt validation and onboarding stop/advance behavior, including retry without another extraction.

## Verification and limits

397 tests across 37 files pass. Optimized webpack build (35 static outputs), TypeScript no-emit, release lint and explicit readiness-helper lint pass. Existing useQuestionAttempt cleanup-ref warning remains. Profile is outside the legacy lint allowlist; it is typechecked/built and uses the tested validator. Browser, physical-device and native-reader acceptance remain pending.

02c is not fully closed: the background original-file upload has no durable client-visible job/status receipt. This change confirms saved readable profile data, not S3 success or provider extraction quality. Exact-upload storage reconciliation, ambiguous timeouts and recovery across reloads require backend work. No live AI calls or production data changes were made.
