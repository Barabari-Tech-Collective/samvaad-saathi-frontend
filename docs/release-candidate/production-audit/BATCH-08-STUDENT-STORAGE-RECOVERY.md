# Batch 08 — Student file-storage check

23 October 2026. Frontend-only local changes. Requires the Batch 07 endpoint and extraction receipt field.

## Completed

- [x] Profile and onboarding remember valid server-returned fileSha256 receipts with their account owner in sessionStorage. No file bytes, filename or credentials are persisted by this helper.
- [x] Profile offers a named, keyboard-accessible file-storage section with an explicit Check file storage button, busy state and polite status messages.
- [x] A check makes only an authenticated GET. It never reuploads the file or automatically repeats extraction.
- [x] Registered responses require the matching hash and a positive resume ID. Missing records remain unconfirmed, with honest possible explanations; malformed responses and network errors offer a repeat check.
- [x] Old account results, superseded receipts and unmounted component results are ignored. Storage denial does not turn an acknowledged upload into an error.
- [x] Eight new tests cover remount restoration, account mismatch, registered/unconfirmed/mismatched responses, newer uploads, account changes and storage denial.

## Verification

405 tests across 38 files pass. Optimized webpack build (35 static outputs), TypeScript no-emit and release lint pass; the prior useQuestionAttempt warning remains. New helper/component explicitly lint clean. Existing profile page remains outside the legacy lint allowlist. Diff whitespace check passes. Backend unchanged; its last batch had 1,144 passing unit tests.

## Limits

Storage is same-tab sessionStorage: restoration is supported only while the tab session and account remain available. The existing account boundary/logout clears receipts on account changes. Actual browser reload and assistive-technology behavior remain untested by agreement; jsdom remount tests are not real-browser acceptance.

Only the latest acknowledged fingerprint is retained. If storage is blocked, no cross-reload recovery is offered. If the upload response never reaches the client, there is no fingerprint receipt to recover here. Durable failure/job tracking, client-generated identities before upload, server retry idempotency, and lost-response reconciliation remain open under 02c. Registered means a database record, not current object-store availability. No production deployment or live provider calls.
