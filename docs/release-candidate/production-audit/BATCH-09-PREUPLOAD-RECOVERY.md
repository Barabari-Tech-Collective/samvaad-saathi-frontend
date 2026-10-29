# Batch 09 — Remember exact-file identity before upload

23 October 2026. Local frontend changes; no deployment.

## Completed

- [x] Read original file bytes and compute SHA-256 using Web Crypto before extraction dispatch. Store the fingerprint using the existing account-owned session receipt helper.
- [x] Account checks run before file reading, after reading and after hashing. Stale preparation cannot dispatch under a different account.
- [x] Profile and onboarding both use preparation; onboarding now exposes the recovery panel without requiring the learner to finish account setup first.
- [x] Recovery wording describes a prepared upload, not necessarily an acknowledged response. A registered record explicitly does not confirm the latest profile changes.
- [x] Four new tests verify the known SHA-256 of original bytes, stale preparation, account switch during hashing and missing secure hashing. Existing upload-switch test now waits for dispatch before changing accounts.

## Verification

409 tests across 39 files pass. TypeScript no-emit, optimized webpack build (35 static outputs), release lint, explicit recovery helper/panel lint and diff whitespace checks pass. Existing useQuestionAttempt warning remains. No live AI, AWS or production requests were made.

## Limits and next work

This supersedes Batch 08's limitation that a returned upload receipt is required: a fingerprint is now prepared before sending. Same-tab reload recovery requires working sessionStorage and the existing stable account identity. Storage denial preserves upload behavior but cannot provide reload recovery; secure hashing/read failures stop dispatch with an error.

The recovery panel only reads stored records and never automatically resubmits. A manually repeated upload is not yet server-idempotent. Durable job/failure status, process-restart recovery, bounded retries and exact operation receipts remain open under 02c. A stored identical file may be from an older attempt; it does not establish whether a later extraction or profile update succeeded. Real browser reload, physical-device and screen-reader acceptance remain pending.
