# Batch 15 — Durable résumé file delivery

23 October 2026. Implemented locally; no production migration, provider calls, push or deployment.

## Completed

- [x] Store bounded original bytes (maximum 5 MiB), exact SHA-256 and delivery metadata in PostgreSQL before acknowledging successful extraction/profile persistence.
- [x] Immediate delivery and recurring worker pickup use the same storage-only function; neither reruns AI extraction nor writes the profile.
- [x] Claim at most five pending files with `FOR UPDATE SKIP LOCKED`; account/fingerprint-scoped calls require both identifiers.
- [x] Preserve pending attempt counters when staging is repeated. Stop after three committed failed attempts.
- [x] Clear staged bytes and extracted text on success or exhausted retries. Sweep pending/failed payloads after their 24-hour expiry.
- [x] Add migration d8e9f0a1b2c3; validate single migration head/offline SQL and apply only to guarded localhost samvaad_local.
- [x] Real local PostgreSQL acceptance: committed bytes survive a new session, a concurrent claimant skips the locked job, cancellation rolls back, and a later delivery succeeds and removes payloads. The storage function was synthetic; no live provider was called.

## Verification

Backend unit suite: 1,186 passed, 456 warnings. Warnings remain; this is not a warning-free acceptance result. Diff whitespace checks pass. Student code is unchanged in this batch; its previous 422-test result is historical, not a rerun.

Local acceptance runner: `ops/local-test/product.py <private-local-config> resume-storage`. It deletes only its random synthetic job afterward. Test logs: /tmp/samvaad-b15-db.log and /tmp/samvaad-b15-unit-final.log.

## Remaining before closing 02c

- [ ] Restart/accept the local API and worker with this candidate; existing processes were not restarted in this batch. The new worker cron is configured every minute and at startup in source only.
- [ ] Expose durable delivery state/failure/expiry in student recovery UI. Current storage lookup still reports registered/unconfirmed.
- [ ] Exercise actual object storage, process termination, worker downtime and restore behavior end to end.
- [ ] Resolve the object-write/database-commit crash window and possible orphan objects. This is not exactly-once object storage.
- [ ] Make profile persistence, staging and extraction-operation completion recovery coherent: they currently commit separately. A crash between profile save and staging can still require the original file again.
- [ ] Review database capacity, encryption at rest, backup retention and terminal-row cleanup. Staged payloads are not application-encrypted; filenames remain after payload removal. The 24-hour expiry is enforced by worker execution, not guaranteed wall-clock deletion.
- [ ] Operational retry/monitoring acceptance: locks span storage calls; a cancelled transaction rolls back attempt counters. Three committed failures is not a strict lifetime cap across process crashes. Failed jobs are not automatically reset by re-staging.

Browser, physical mobile and native screen-reader acceptance remain pending under the user's existing constraints.
