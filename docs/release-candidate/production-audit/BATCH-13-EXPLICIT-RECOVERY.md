# Batch 13 — Explicit recovery for failed or unsaved extraction

23 October 2026. Local backend/frontend changes; no schema migration or production deployment.

## Completed

- [x] Authenticated POST /me/resume-operations/{request_key}/recovery checks the account-owned previous operation. Only failed or completed-with-explicit-saved-false records qualify.
- [x] Recovery of started/unknown, completed-with-missing-receipt and completed/saved-true operations returns 409. Elapsed time alone does not establish that work has stopped.
- [x] A deterministic UUID derived from account and parent operation produces the same child key on repeated requests. Preparation executes no extraction and preserves the parent record; ordinary atomic admission protects later requests using that child key.
- [x] UI offers Prepare another attempt only after a qualifying status check, explains potential earlier writes, and tells the student to select/submit the file explicitly. No automatic reupload.
- [x] Client validates child UUID/hash, current account and unchanged previous operation before saving the new key. Delayed recovery cannot replace newer upload state. Storage failure produces a retryable preparation error.

## Verification

Eight new backend and three new frontend regression cases. Full suites: 1,163 backend tests, 420 student tests. TypeScript no-emit, optimized webpack build, release lint, explicit recovery helper/panel lint and both repository whitespace checks pass. Existing frontend hook warning and backend dependency/ORM/resource warnings remain.

Local API safely restarted after checking its recorded command. Authenticated local HTTP acceptance passed, extended to reject recovery for unresolved operations in ASGI and saved operations against the running local server. Extraction remained synthetic, with no AI/profile/storage writes. The successful recovery preparation path is covered by unit/component tests; full browser retry remains unverified.

## Remaining boundaries

This does not recover a crash-left started operation, establish that partial writes were rolled back, or retry failed background storage. Durable work delivery, execution fencing/leases, original-file retention and bounded retry policy remain open under 02c. A child key is not itself persisted as an operation until upload admission; repeated preparation derives the same key so losing that response is safe to repeat. New keys are not abuse/quota controls. Same-tab latest-file retention limits still apply. Browser/native-reader/physical-device acceptance remains pending.
