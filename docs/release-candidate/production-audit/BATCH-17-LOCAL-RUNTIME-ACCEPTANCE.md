# Batch 17 — Activate and verify the local runtime

23 October 2026. Updated only the recorded local API and worker processes. No production changes, migrations, live AWS, AI or speech calls.

## Completed

- [x] Added a reusable guarded resume-runtime acceptance command. It verifies dedicated loopback backing services and exact recorded process command paths before stopping either process; gracefully stops only those PIDs, refuses a mismatched PID or unresponsive stop, and records replacement PIDs through the existing local launcher.
- [x] Preflight inspected the local queue for non-maintenance jobs, active worker claims, pending résumé deliveries and pending/processing audio. No such work was present during this run.
- [x] Restarted the local API and verified its live OpenAPI includes deliveryStatus.
- [x] Authenticated through the local central identity service and checked real HTTP delivery status, no-store response, another account's isolation and unauthenticated denial.
- [x] Restarted the actual local arq worker. Its startup cron transitioned a committed, expired synthetic job to expired and removed staged bytes/text. The acceptance script did not call the delivery function itself.
- [x] Removed only the randomly identified synthetic staging row after acceptance. Both replacement processes remained running.
- [x] Reran the existing authenticated résumé HTTP regression. Duplicate/conflicting extraction keys, receipt replay, account isolation and unsafe recovery/repair denial passed with synthetic extraction and the running API.

## Evidence

- /tmp/samvaad-b17-runtime.log: local preflight and live API/worker cron acceptance PASS.
- /tmp/samvaad-b17-http.log: authenticated ASGI and live-server regression PASS. Expected 409 denial logs are part of the test.
- Python compile and git diff whitespace checks passed.
- No application behavior changed this batch; the previous 429 student / 1,192 backend unit results remain historical rather than new reruns. Existing SQLAlchemy relationship warning remains visible in local acceptance.

## Reproduction and limits

From the backend repository: `.venv/bin/python ops/local-test/product.py ../samvaad-local-test/product.json resume-runtime`.

Run while local manual testing is idle. Queue inspection is a point-in-time guard, not a maintenance lock against new submissions. The command does not remove unknown queue jobs or reset local data. It restarts the API before the worker; if a later assertion fails, an already restarted service remains on the candidate and the command reports failure.

The expired-file fixture intentionally avoids object-storage delivery. This proves worker startup and real cleanup orchestration, not successful object upload, storage-failure retries, AWS behavior or delivery under process crashes. Storage crash/orphan reconciliation, multi-transaction recovery, operational monitoring/retention and browser/device acceptance remain open. The full 02c item is not complete.
