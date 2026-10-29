# Batch 10 — Durable keyed extraction contract

23 October 2026. Backend code and migration authored; migration NOT applied. Frontend NOT opted into keyed requests.

## Completed locally

- [x] resume_operation table/model with account + UUID primary key, exact-byte SHA-256, started/completed/failed states and cached extraction receipt.
- [x] Optional Idempotency-Key on extract-resume. PostgreSQL INSERT ON CONFLICT claims a key and commits admission before provider/profile side effects.
- [x] Same account/key and matching bytes replay completed receipts without running extraction again. Different bytes, failed operations and unresolved started operations return 409 without replaying side effects.
- [x] Work exceptions persist a sanitized failed state; interrupted/unknown work is never automatically retried. Final persistence failure leaves an unresolved operation rather than allowing automatic replay.
- [x] Authenticated /me/resume-operations/{request_key} status lookup returns only key, hash, state and dataSaved, with no-store caching and account scoping. Missing or other-account records return 404.
- [x] Existing unkeyed clients retain their current behavior.

## Verification

10 new service/status unit cases; 21 focused cases pass including prior fingerprint tests. Full backend unit suite: 1,155 passed with 456 warnings. Alembic has one head, c7d8e9f0a1b2; upgrade SQL from b6c7d8e9f0a1 generates successfully. Diff whitespace check passes. No live database migration or concurrency acceptance was performed; tests mock sessions and verify PostgreSQL statement structure and side-effect sequencing.

## Limits / next steps

Apply and verify the migration only against the isolated local database, exercise concurrent real transactions and process interruptions, then connect persisted client UUIDs and operation-status/retry UI. The frontend does not send Idempotency-Key yet, so end-user duplicate-safe extraction is NOT complete.

Operation completion describes extraction/profile processing, not background S3 success. dataSaved can be false in a completed receipt. Original-file failure tracking, durable worker delivery, operation retention and explicit recovery of interrupted operations remain open. Cached extraction receipts contain résumé-derived data and must follow the same retention/access policy as résumé data; the status endpoint does not expose those contents. A new UUID intentionally starts new work, so idempotency is not a quota/abuse control. No production/provider calls or deployment.
