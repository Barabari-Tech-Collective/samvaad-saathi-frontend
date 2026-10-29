> **Batch 02:** account/cache and shared-transport protections are implemented with 12 new regressions (363 student tests passed). O04 remains open for direct-transport review and actual two-tab browser acceptance. See [batch details](BATCH-02-ACCOUNT-ISOLATION.md) and [tracker](FIX-TRACKER.md).

# Production failure and UX audit — 22 October 2026

**This is a local candidate hardening pass, not production certification.** It continues the student Interview Studio redesign and adds failure-mode tests and a detailed acceptance register. No production code, schema, accounts or data changed. No browser was launched: the user's instruction to keep browser access disabled remains in force. Physical mobile and native VoiceOver remain unavailable/pending.

## Current work

Use [FIX-TRACKER.md](FIX-TRACKER.md) for the sequential checkbox list and latest status. O01’s screenshot-save code is replaced; its document acceptance remains pending.

## Read these first

- [Confirmed fixes and remaining risks](FINDINGS.md): what can fail, why it matters, current disposition.
- [85 reproducible test cases](TEST-CASES.md), also [CSV](test-cases.csv): setup, action, expected result, relevant test evidence and acceptance gaps.
- [Device, accessibility and brand audit](DESIGN-AUDIT.md): concrete source findings plus the device/state matrix needed for visual acceptance.
- [86-route inventory](route-inventory.csv): 32 student routes and 54 dashboard/central product routes. Every row still requires rendered acceptance; indexing is not testing.
- [Source review leads](source-review-leads.csv): searchable file/line pointers. Patterns such as overflow clipping or small text are leads, not automatically defects. Intentional document previews, chart labels and contained tables need contextual review.
- [Verification and commands](VERIFICATION.md): exact scope of automated evidence and its limits.

The highest-consequence production risks are authorization leakage across accounts/courses, stale or duplicate interview writes, immutable-publication violations, private data in exports/telemetry, missing audio after interruption, and misleading scores or integrity decisions. A premium visual treatment cannot compensate for those failures.

## Execution order after this pass

1. Resolve the remaining screenshot-based résumé profile-save path, cross-tab/account cache acceptance and legacy drill create/upload idempotency. Do not infer these are covered by formal-assessment tests.
2. Run the isolated real SQL/HTTP suites and authenticated local journeys for student, scoped facilitator, placement/program/partnership permissions, admin and super-admin. Include the new reviewer/appeal flows. Do not create hosted staging: the user declined it.
3. Review the actual redesigned routes against the device matrix when browser access is enabled or the user supplies manual results. Fix confirmed layout/task defects before wider presentation changes.
4. Complete real audio/codec, Google Meet admission and provider outage acceptance. Retain physical-phone and native-reader gates as pending until access exists.
5. Collect independent reviewed Jev labels and run empirical calibration. Synthetic tests and the collection workflow do not satisfy this gate.
6. Measure representative concurrency/cost, verify deployment configuration and exact release heads, rehearse backup/restore/rollback, then choose a constrained cohort pilot. An older passing CI head or backup is not evidence for this changed candidate.

No claim of “all edge cases covered,” “zero cheating” or “works on every device” is justified by this pass. The CSV explicitly leaves integrated outcomes empty for the person executing them to record.
