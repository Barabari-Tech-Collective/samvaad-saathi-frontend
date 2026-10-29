# Batch 16 — Student-visible résumé delivery status

23 October 2026. Local candidate only. No migration, service restart, provider calls, push or production deployment in this batch.

## Completed

- [x] Extend the existing account/exact-file storage receipt with nullable deliveryStatus: pending, failed or expired. Existing registered/unconfirmed status remains compatible.
- [x] Query delivery state/expiry only; never load or return staged file bytes, text, filenames, storage keys or raw provider errors for a status check.
- [x] Give an existing saved registry record precedence over historical delivery state. A stored job without a current registry record remains unconfirmed, because the file may have been removed.
- [x] Report overdue pending jobs as expired without waiting for a cleanup worker. Expiry means the delivery window ended, not proof that retained bytes were already deleted.
- [x] Explain each delivery state in the student recovery panel. Suppress manual restoration while delivery is pending; retain exact-original-file repair after failed/expired delivery when extraction confirms saved data.
- [x] Support older API responses without deliveryStatus; reject unknown delivery states and mismatched file receipts. Preserve account revision and request-lifetime guards.
- [x] Clear stale extraction/repair messages when beginning a new check.

## Evidence

- Student: 429 tests passed across 40 files (7 new cases).
- Backend: 1,192 unit tests passed, 456 warnings (6 new cases). Warnings remain; not a warning-free result.
- TypeScript and targeted ESLint passed. Changed frontend files formatted.
- Real isolated local PostgreSQL acceptance passed: staging, skip-locked concurrent delivery, interrupted transaction rollback, later completion/payload cleanup, account-scoped status, historical stored job without registry, and expiry before cleanup. Synthetic uploader only; random test row removed afterward.
- Logs: /tmp/samvaad-b16-student.log, /tmp/samvaad-b16-backend.log, /tmp/samvaad-b16-types.log, /tmp/samvaad-b16-lint.log and /tmp/samvaad-b16-db.log.

## Remaining

- [ ] Restart and accept the local API/worker candidate; current long-running services have not been updated by this batch.
- [ ] Real object-store failure/crash/restore acceptance and orphan-object reconciliation.
- [ ] Atomic recovery across separately committed profile, staging and extraction-operation records.
- [ ] Worker monitoring, capacity, encryption/backup retention and terminal-row cleanup.
- [ ] Browser, physical-device and native screen-reader acceptance under the agreed availability constraints.

This panel checks on demand and remembers only the latest file in the current tab session. Pending status confirms a queued database record, not worker health or a delivery-time guarantee. The whole 02c item remains open.
