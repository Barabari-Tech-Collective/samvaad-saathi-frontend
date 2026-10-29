# Batch 04 — Direct requests retain account ownership

22 October 2026. Local implementation; no production deployment or provider calls.

## Completed

- [x] Added accountJson: checks initiating revision before transport, after response headers, after JSON parsing, and on failures. Requires authentication and overrides caller Authorization headers with the current account token only after revision validation.
- [x] Profile résumé download and profile/onboarding polling use the guarded helper. Each page retains its original revision; polling cannot silently follow another account's cookie.
- [x] Onboarding cannot advance after an account switch during résumé extraction.
- [x] Hygiene profile-save and both AI analysis callers validate ownership before processing results or showing feedback. Save/poll notifications have revision-specific IDs.
- [x] Direct AI analysis guards dispatch, success and failure; removed its raw exception logging. Same-account service errors remain available to existing error handling.
- [x] Profile download validates HTTPS and opens with noopener/noreferrer.

## Evidence

376 tests across 35 files pass, including eight new tests covering stale dispatch, delayed JSON, stale network failures, HTTP errors, successful authenticated upload, stale AI success/failure and onboarding callback suppression. Optimized webpack build passes with 35 static outputs. TypeScript no-emit and release lint pass; existing useQuestionAttempt cleanup-ref warning remains. The new helper and AI service were explicitly linted; existing profile/hygiene/input-form files remain outside the legacy release lint allowlist and were typechecked/built.

## Open work

02a remains open for imperative shared-client callers (meeting-link, catalogue, completion) and the broader callback audit. The public signup request-access endpoint is not an authenticated account request and was not changed. Existing token refresh and PDF service have prior batch guards. 02c tracks the discovered polling exhaustion/readiness issue; this batch does not claim upload reconciliation. Browser, physical-mobile and native-reader acceptance remain pending as agreed. Requests already accepted by the server cannot be undone by client revision checks.
