# Batch 20 — Consolidated privacy and design fixes

24 October 2026. Local changes only; no production deployment or browser/device acceptance.

## Verified code changes

- [x] Generic error reporting emits a fresh generic error and an allowlisted category. Raw exception messages, stack, causes, arbitrary context, route and digest are omitted.
- [x] Analytics initialization explicitly disables session recording, autocapture, automatic pageview/pageleave, automatic exceptions and surveys. Explicit analytics events still exist and need broader property review.
- [x] Profile-change tracking no longer sends the new field value; report-generation tracking no longer sends free-text error details.
- [x] Résumé file selection says “Not uploaded yet”; file input remains keyboard-focusable, replacement button has an accessible name and minimum target size, and validation errors are announced and associated with the input.
- [x] Upload guidance is readable, wraps and uses the shared size constant.
- [x] Layout-example explanation moved outside the decorative preview. On-screen résumé text increased to readable sizes, justified body copy removed, and unsupported “A4 | 1 page” claim replaced. Backend PDF generation remains unchanged.
- [x] Staff Roles, Teams, team-detail and MemberModal labels/status/error text enlarged and muted/error colors darkened.
- [x] Expanded ESLint release coverage to the changed student modules and removed their lint errors/warnings. Added explicit preview data types.
- [x] Fixed test-only cross-realm WebCrypto input handling while continuing to hash actual FileReader bytes. No application hashing change.

## Evidence

Student: 434 tests passed across 42 files. Student TypeScript and targeted ESLint pass. Staff TypeScript and 17 bulk-ATS tests pass. Git diff whitespace checks pass. No backend behavior changes or backend test rerun in this batch.

Logs: /tmp/samvaad-b20-final.log, /tmp/samvaad-b20-types-final.log, /tmp/samvaad-b20-lint-final.log, /tmp/samvaad-b20-staff-types.log, /tmp/samvaad-b20-staff-tests.log.

## Design critique and iteration

Source-level critique using design:design-critique, not a rendered inspection:

| Finding | Impact | Implemented response | Remaining acceptance |
|---|---|---|---|
| “Uploaded” before a request | Misleading progress | Explicit local selection wording | Real task walkthrough |
| display:none file input, unnamed replace icon | Keyboard and reader barriers | Focusable input, named button, linked alerts | Native focus/announcements |
| Tiny floating illustrative badge | Clipped/unreadable explanation | Persistent text outside illustration | Narrow viewport check |
| 10–11px document body and one-page claim | Difficult review and false expectations | Readable on-screen text, honest pagination copy | Long Hindi/mixed-content layout |
| Small/pale staff access and error labels | Hard to understand permissions | Larger/darker labels on four screens | Computed contrast, 200% text and mobile modal |

Positive structure retained: canonical backend PDF save/download, account-owned recovery guards, and text-labelled task actions. No claim about first visual impression can be made without rendering.

## Work still outstanding

This does not complete the user's consolidated request. Engineering items still include terminal/historical orphan reconciliation, multi-transaction recovery, legacy drill idempotency/audio recovery, remaining callback and telemetry audits, and integrated integrity/media/publication acceptance. Staff question-authoring typography beyond the four named screens remains open. Browser, physical mobile and native screen reader remain unavailable by prior user instruction; empirical Jev labels and verified historical production mappings also remain unavailable. These are not checked off.
