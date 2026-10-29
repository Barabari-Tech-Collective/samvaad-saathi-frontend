# Batch 18 — Real local object-store delivery and recovery

23 October 2026. Local S3-compatible object store only. No production, AWS account, AI or speech calls.

## Completed

- [x] Added resume-objects acceptance with exact loopback endpoint/bucket/queue guards and a fresh synthetic account. Existing students and their three-file retention limits are untouched.
- [x] Verified original uploaded bytes by downloading the stored object and comparing exact contents; streaming bodies are closed.
- [x] Verified anonymous object GET is denied.
- [x] Verified completed-job replay does no additional delivery and re-staging the same bytes reuses the existing registry key.
- [x] Used a unique absent bucket in this test process to produce real local NoSuchBucket errors, without changing the storage server or runtime configuration.
- [x] Verified one failure retains the original staged bytes and no registry record; restoring the valid bucket makes the next attempt succeed, registers the file and clears staged payload/text.
- [x] Verified three committed failures mark the job failed and clear payload/text; subsequent worker delivery does not retry it.
- [x] Paused only the recorded local worker during fault injection and relaunched it afterward. Removed the newly created synthetic account and every object under its unique user prefix, including possible unregistered test objects.
- [x] Corrected local preflight: arq retains completed cron claim markers, so active work requires both a marker and queue membership. Three focused regressions pass, including a zero-valued queue score.

## Evidence

/tmp/samvaad-b18-objects.log contains three PASS summaries for real bytes/privacy/dedup, real missing-bucket recovery/exhaustion, and cleanup/worker relaunch. Expected missing-bucket error logs are intentional fault evidence.

/tmp/samvaad-b18-guard.log: 3 focused unit tests pass. Python compilation and diff whitespace checks pass. Prior 429 student / 1,192 backend full-suite results are historical; those suites were not rerun because application behavior did not change in this acceptance batch.

## Reproduce

From the backend repository: `.venv/bin/python ops/local-test/product.py ../samvaad-local-test/product.json resume-objects`.

Run with manual local work idle. Guarding the queue is a point-in-time check, not a maintenance lock. The test briefly stops the verified local worker and restores it in cleanup. It never changes the live API's bucket setting. A cleanup failure is an acceptance failure, not a silent pass.

## Still open

- [ ] Process termination after object creation but before registry commit; orphan-object reconciliation and ambiguous commit outcomes.
- [ ] Coherent recovery across profile, staging and extraction-operation transactions.
- [ ] Explicit restore-file HTTP success against storage; this batch invoked the real storage delivery service directly.
- [ ] Concurrent different-file retention, worker downtime/backoff, network timeout and representative load acceptance.
- [ ] Production AWS IAM/KMS/lifecycle behavior and operational retention/monitoring.
- [ ] Browser/device/native-reader acceptance.

Passing a loopback S3-compatible test is not production AWS acceptance. The full 02c item remains open.
