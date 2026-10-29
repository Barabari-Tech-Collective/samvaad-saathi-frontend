# Batch 11 — Local database acceptance and keyed client

23 October 2026. Local-only migration and implementation; no production deployment.

## Completed

- [x] Applied c7d8e9f0a1b2 through ops/local-test/product.py, which guards POSTGRES_HOST=127.0.0.1, POSTGRES_DB=samvaad_local and local Redis configuration. No saved production database config loaded.
- [x] Added reproducible resume-operations acceptance mode: real PostgreSQL concurrent same-key request rejected; committed receipt replayed; differing bytes rejected; exactly one synthetic work call. Only its generated operation row is deleted afterward; no profile/provider writes.
- [x] Profile/onboarding persist a UUID for the current account/file before dispatch and send Idempotency-Key through the shared mutation configuration. Storage persistence failure blocks a new keyed upload with an explanation.
- [x] Recovery panel checks extraction state separately from file registration and validates operation key/hash/state/dataSaved before showing it.
- [x] Tests cover retained key reuse, different accounts/files, storage denial and four operation states. Onboarding regression verifies the request header is populated at dispatch.

## Evidence

417 student tests across 40 files pass (eight new cases). TypeScript no-emit, optimized webpack build (35 static outputs), release lint, explicit recovery helper/panel lint and diff whitespace checks pass. Existing useQuestionAttempt warning remains. Backend local PostgreSQL acceptance passes; existing ORM overlap warning remains. Previous full backend unit result: 1,155 passing; backend business logic unchanged this batch.

## Remaining scope

The local database schema is current, but this turn did not restart the already-running API process or perform an authenticated full HTTP upload. Restart the local API using the established local launcher before manual testing of the new endpoints. End-to-end HTTP/provider and browser reload acceptance remain pending. Production rollout must apply the backend migration and release backend support before this client.

Only the latest file's operation key is retained per tab; selecting another file then returning to an earlier file may create a new operation. Separate tabs/new sessions are not deduplicated unless they share a key. Failed/unresolved operations cannot yet be explicitly recovered in the UI; retries retain the key and are refused safely. Automatic lease recovery, durable background storage execution, failure retry policy and retention remain open under 02c. A completed operation is not a storage guarantee. No production resources, real AI calls or browser automation were used.
