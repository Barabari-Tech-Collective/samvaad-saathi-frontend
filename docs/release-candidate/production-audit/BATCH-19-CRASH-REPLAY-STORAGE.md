# Batch 19 — Recover delivery after an upload/registry process crash

23 October 2026. Application implementation and local acceptance; production unchanged.

## Completed

- [x] Durable staged delivery uses a stable key derived from account ID and the verified original-byte SHA-256. Retrying after upload but before registration targets the same object key.
- [x] Reject mismatched or missing fingerprints before durable storage writes.
- [x] Preserve stable objects after database errors, including ambiguous commit outcomes, and on losing concurrent inserts. These objects may already belong to a successful registration; deleting them would be unsafe.
- [x] Keep legacy upload callers compatible. Only the durable staging worker opts into stable keys; existing registered records continue to deduplicate before upload.
- [x] Added a guarded synthetic child mode that actually exits with code 73 immediately after a successful local object write, before registry insertion. The parent verifies committed pending bytes survive, registry is absent, object exists, and retry registers the exact same key with only one current object under that key.
- [x] Re-ran local real-byte/privacy/dedup and missing-bucket recovery/exhaustion acceptance. Synthetic fixtures removed and local worker relaunched.
- [x] Restarted verified local API and worker on this candidate; live schema/auth/account-isolation and real cron expiry cleanup acceptance pass.

## Evidence

- /tmp/samvaad-b19-objects.log: real child-process interruption and recovery PASS, plus prior object-store scenarios.
- /tmp/samvaad-b19-runtime.log: live API/worker acceptance PASS.
- /tmp/samvaad-b19-focused.log: 16 focused tests pass (one existing SQLAlchemy warning), including key stability/account separation, fingerprint validation and preserving a stable object after an ambiguous commit exception.
- Full backend regression: 1,199 passed, 456 warnings; /tmp/samvaad-b19-unit-final.log.
- Diff whitespace checks pass. No frontend change or frontend test rerun.

## Remaining

- [ ] Reconcile stable objects whose jobs ultimately fail or expire. Preserving these objects prevents unsafe deletion but does not guarantee cleanup; absence of a registry is not by itself safe deletion evidence during a concurrent writer.
- [ ] Reconcile historical randomly named orphan objects and legacy/manual-repair races.
- [ ] Verify bucket version history/lifecycle: one current object key does not imply one physical version in a versioned production bucket.
- [ ] Test ambiguous commit against a real dropped database connection, concurrent different-file retention and object-store network partitions.
- [ ] Coherent recovery between profile persistence, staging and operation receipt commits.
- [ ] Production AWS policy/encryption/retention/load and browser/device acceptance.

Stable-key replay is not exactly-once storage and does not close the overall 02c item. The child test targets one precise boundary; it is not exhaustive chaos testing.
