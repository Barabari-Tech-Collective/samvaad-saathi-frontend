# Batch 07 — Account-scoped exact-file reconciliation

23 October 2026. Backend-only foundation, no migrations or production changes.

## Completed

- [x] Extraction responses now include fileSha256 computed from the original uploaded bytes, before text normalization. The same fingerprint is passed to background storage and remains available when profile persistence fails.
- [x] GET /me/resume-storage/{file_sha256} uses the authenticated user ID and exact normalized SHA-256 to look up an existing UserResume row.
- [x] Response exposes only fingerprint, registered/unconfirmed status and optional resumeId. No S3 keys, content or filenames; Cache-Control: no-store.
- [x] Invalid hashes fail before a database query. Uppercase valid hashes normalize to lowercase.
- [x] Eleven new unit tests cover account/hash query predicates, unknown status, invalid inputs and extraction fingerprints with successful/failed profile persistence. Focused schema/receipt run: 12 passed.

Full backend unit suite: **1,144 passed**, with 456 warnings (including dependency deprecations, ORM relationship warnings and resource warnings). Backend diff whitespace check passed. Frontend was unchanged and not re-tested in this batch.

## Semantics and remaining work

registered means a database storage record exists; it is not a fresh S3 availability check. unconfirmed deliberately does not distinguish queued, failed, deleted or never submitted. Existing rows already provide the required hash index/uniqueness constraint; no migration is required for this endpoint.

This is not a durable job queue or a complete student recovery flow. The frontend is unchanged in this batch. Client-side fingerprint persistence across reloads, recovery UI, authoritative failure/job states and retry idempotency remain under 02c. Browser and physical-device acceptance remain pending. Unit tests use synthetic uploads and mocked providers/database execution; no live credentials or production data used.
