# Batch 14 — Restore the original file without extraction

23 October 2026. Local backend/frontend implementation. No migrations or production changes.

## Completed

- [x] POST /me/resume-operations/{request_key}/restore-file requires an authenticated, account-owned completed operation with saved=true, original content type, exact SHA-256 and at most 5 MB.
- [x] Storage-only repair re-reads text locally and invokes existing file storage/registration. It does not call AI or update User profile data. The existing three-file retention limit still applies and is disclosed in UI.
- [x] Account-scoped transaction advisory lock serializes repair calls; existing exact-file records return immediately. Registration is checked after storage; failures return sanitized 503 and never claim success.
- [x] Profile/onboarding recovery offers original-file selection and Restore file only after saved extraction plus unconfirmed storage. Ambiguous failures prompt checking before retry; stale-account/unmounted/superseded callbacks are ignored.
- [x] Ten backend tests cover eligibility, file mismatch/type/size, existing-record replay, exact-byte repair without AI, storage failure and scoped lookup. Two frontend tests cover selected-file dispatch and ambiguous failure feedback.

## Evidence

422 student tests and 1,173 backend unit tests pass. TypeScript, optimized webpack build, release lint, explicit panel lint and both diff whitespace checks pass. Existing frontend cleanup-ref warning and backend dependency/ORM/resource warnings remain.

The verified local API was restarted. Synthetic authenticated HTTP acceptance passed, extended to reject storage repair for unresolved operations and wrong bytes on the live local server. No live AI/profile/storage writes were made by these acceptance checks. Successful upload/registration uses a mocked uploader in unit tests; real local storage success/concurrency and browser acceptance remain pending.

## Boundaries

This is an explicit re-supply path using the student's original file, not a durable background queue. A stored database record does not prove the object still exists in storage, so this path does not repair an orphaned/missing object behind an existing record. Durable staging, crash recovery, delivery/retry policy and retention cleanup remain open under 02c. The per-account repair lock serializes repair endpoint calls; normal legacy uploads are not participants in that lock and use existing hash deduplication behavior. A failed or ambiguous extraction still cannot use this endpoint. No production deployment.
