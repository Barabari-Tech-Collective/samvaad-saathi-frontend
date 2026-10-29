# Placement-to-graduation workflow — approved eligibility

24 October 2026. User decision: staff verifies job placement AND course completion; admin approves graduation. This document records requirements, not implemented functionality.

## Required behavior

A student may be nominated only with both verifications recorded against the student's relevant course/program. Record verifier identity, timestamp and evidence reference for each. Do not equate an interview score, shortlist, education graduationYear or staff note alone with verified employment/course completion.

State flow: in progress → staff verified / awaiting approval → admin approved / graduated. Return-for-correction preserves history and invalidates the previous approval request. Corrections after approval require an explicit audited reversal, not silent edits. Approval rechecks both verifications, current staff authority, current scope and the expected record version. Administrative approval must be a distinct recorded action. No automatic loss of login access on graduation; alumni access and data retention need explicit policy before enforcement.

## Authorization and concurrency acceptance

- Student cannot set either verification or approve graduation; student sees their own status and non-sensitive reasons.
- Staff can verify only within active role/course/college assignments and explicit feature permissions; roles alone do not grant global access.
- Admin approval is denied if either verification is missing, revoked, superseded or outside the relevant program.
- Versioned writes and transaction locks ensure simultaneous approval/correction has one consistent result; request keys make retries idempotent.
- Audit trail records actor, action, old/new state, evidence references and reason without embedding employment documents in analytics.
- Private employment evidence must not appear in unrelated staff/student responses, exports, logs or session replay.
- Central identity/course revocation, multi-role membership, multiple courses, job withdrawal, duplicate employment entries, stale evidence, account merge/deletion and program change all need explicit tests.

## Implementation remains open

Persistent lifecycle/evidence records, migration, scoped staff/admin endpoints, student status view, dashboard verification/approval/reversal screens, evidence access controls and integrated acceptance. No new graduation endpoints or production data changes were made in batch 21. This is a product capability gap discovered by the requested audit, not a passed end-to-end journey.
