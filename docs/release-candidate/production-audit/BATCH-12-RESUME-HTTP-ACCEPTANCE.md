# Batch 12 — Authenticated local HTTP acceptance

23 October 2026. Local test tooling and acceptance checkpoint; production unchanged.

## Completed

- [x] Added ops/local-test/resume_http_acceptance.py and guarded product.py resume-http mode. Uses real local central-auth login, real application authentication dependencies and isolated PostgreSQL. Credentials stay in memory; no tokens printed.
- [x] ASGI HTTP router checks: missing/invalid credentials denied; malformed operation key rejected before extraction; unknown operation 404; multipart/header request accepted; concurrent same-key request 409; other account status 404; started/completed status transitions; camelCase extraction response and identical replay; different bytes 409; no-store status response; file storage remains independently unconfirmed.
- [x] Extraction is replaced only in the acceptance process by a synthetic function. Exactly one synthetic work call; no profile, provider or file-storage writes. Generated operation rows cleaned up afterward.
- [x] Restarted only the recorded local API process after checking its command matched the guarded product.py local launcher. Health and OpenAPI verified the keyed header and both receipt endpoints. Other stack services were not restarted.
- [x] Against the running localhost:8000 API: authenticated status read and cross-account denial passed; replay of the pre-existing completed synthetic receipt returned 202 and the identical response. This live request required no extractor or provider call.

## Evidence

The reproducible local resume-http command passes all assertions. Python compile checks and backend diff whitespace checks pass. No app business logic or frontend changes this batch, so prior full unit results remain 1,155 backend / 417 student; they were not rerun as new evidence. This is API/auth/DB acceptance, not browser or real-provider acceptance.

## Remaining

Crash/interruption recovery, durable background file-storage execution, bounded retry policy, record retention and user-directed recovery from failed/unresolved operations remain open. The synthetic extraction receipt deliberately does not prove real PDF extraction, AI quality, persisted profile data or S3 storage success. The frontend browser flow, physical-device and screen-reader checks remain pending under the user's existing constraints. No deployment, GitHub push or production migration occurred.
