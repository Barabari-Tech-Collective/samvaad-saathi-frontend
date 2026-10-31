# Assessment Reviews and Appeals — production-readiness plan

This is a risk-based test and operations plan for learner explanations and appeals. It is not evidence of a production launch or a substitute for independent review policy.

## Client controls implemented

- Review lists are treated as untrusted input. The client rejects malformed cases, timestamps, histories, browser observations, or oversized pages instead of exposing partial evidence.
- A review action is bounded to 10–2,000 trimmed characters even if a browser bypasses the textarea attributes.
- One card accepts one in-flight action. A retry of the same action and text retains the same idempotency key; different action/text/version gets a new key.
- The submitted mutation carries the case's expected version. A stale page must be rejected by the server instead of overwriting a newer decision.
- Late mutation results after an account/session change are ignored by the client.

## Production failure and abuse cases

| Scenario                                                                 | Required server behavior                                                                                                                                                      | Required evidence                                                                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1,000 learners receive review notices or appeal at once                  | Paginate list reads, cap payloads, apply per-account/IP write limits, queue notifications independently, and monitor p95/p99, error rate, DB pool, lock waits, and queue age. | Isolated staged burst/load test using synthetic cases; capacity/SLOs agreed before interpreting a result.         |
| Student opens multiple tabs or double-submits through scripts            | Authorization, idempotency key, expected-version comparison, and a transactionally unique audit event are enforced server-side.                                               | Same-key replay, different-key duplicate, simultaneous tabs, retries after timeout, and exactly-once audit tests. |
| Student edits case/interview IDs in a request                            | Every list/read/action checks authenticated subject plus case, enrolment, and scope ownership; client identifiers never establish authority.                                  | Direct-object-reference tests across two student accounts and revoked enrolment.                                  |
| Reviewer decision changes while learner submits                          | Server returns a conflict/current-state response; it must not append an action to an obsolete case version.                                                                   | Concurrent reviewer/learner mutation test and user-visible recovery copy.                                         |
| Malicious text, huge text, or forged browser observations                | Enforce field-size/schema limits server-side; escape untrusted text in every viewer; avoid telemetry of explanations, evidence, tokens, and raw signals.                      | Contract, XSS/encoding, payload-limit, logging-redaction, and export tests.                                       |
| Deadline passes, timezone/clock differs, or job retries                  | Server is the deadline authority and evaluates it at commit time. Client time is informational only.                                                                          | Boundary tests before/after deadline, clock-skew simulation, retry replay, and audit inspection.                  |
| A student deliberately tries to turn a review into a score/result change | Review actions create a separate case event only; they cannot alter scores, attendance, outcome release, or another student's record.                                         | Authorization matrix and immutable-score/result regression tests.                                                 |

## Mandatory backend and operations controls

1. Immutable append-only case/action audit records with actor, server time, prior/current version, idempotency key, and redacted request correlation ID.
2. Transactional optimistic concurrency plus idempotency semantics. The same key and payload must replay safely; same key with different payload must be rejected.
3. Separate grants for student explanation, appeal, reviewer read, reviewer decision, and result release. An appeal must be assigned to an independent reviewer according to policy.
4. Per-subject authorization and current enrolment checks on every request, including retries and queued notifications.
5. Bounded/validated request and response schemas; security logging must exclude raw explanation/evidence content unless retention policy explicitly permits it.
6. Load shedding and back-pressure so a notice burst cannot exhaust assessment execution, scoring, or database workers.

## Automated coverage added here

- Response parser coverage for malformed/oversized cases, invalid deadlines, histories, and browser observations.
- Client-side explanation validation coverage.
- Existing end-to-end coverage verifies retry uses the same idempotency key and revoked reads hide old evidence.

The frontend does not make an appeal independent, authorize an action, define retention, or guarantee exactly-once writes. Those are server and policy responsibilities and must be verified in an isolated staging environment before production.
