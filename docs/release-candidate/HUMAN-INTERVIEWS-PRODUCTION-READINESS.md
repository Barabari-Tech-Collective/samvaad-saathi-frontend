# Human Interviews — production-readiness plan

This document is a test and operations plan for the Human Interview student flow. It is not a claim that the system has been load-tested or deployed.

## What the student client now defends

- Treats the appointments response as untrusted input. A malformed row, invalid schedule, unknown state, oversized text field, unsupported meeting platform, or oversized page makes the page recoverable rather than displaying guessed appointment data.
- Allows at most 20 appointments in one returned page. The API remains responsible for pagination and the client renders one page at a time.
- Prevents a double-click or rapid repeated click from issuing more than one join-link request from the same card.
- Accepts only a bounded, HTTPS Google Meet URL from the existing verified join endpoint. It uses `noopener`, `noreferrer`, and `no-referrer` when opening it.
- Rechecks account ownership before applying an asynchronous join response. A late response after sign-out or account switch is ignored.
- Does not infer attendance from opening a link, a tab switch, or elapsed meeting time.

## Production scenarios to prove before release

| Risk                                                         | Required server/control-plane behavior                                                                                                                                                | Evidence to collect                                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1,000 students open appointments together                    | Authenticated list endpoint is paginated, indexed by student and current schedule, protected by rate limits, and monitored for error rate, p95/p99, DB pool use, and cache hit rate.  | Isolated staged load test with the agreed arrival pattern, pagination distribution, capacity budget, and SLOs.                   |
| 1,000 students request a join link at the same minute        | Join endpoint authorizes the appointment, checks its current revision/window atomically, rate-limits per account and IP, and is safe to repeat.                                       | Concurrency test with duplicate clicks, multiple tabs, stale schedule revisions, revoked enrolment, and clock-boundary requests. |
| Schedule changes after a page loaded                         | Server returns the current appointment revision and denies a stale/cancelled join request. Scheduled reminders use the same current revision.                                         | Schedule/reschedule/cancel race tests; old browser page and old reminder must not expose current access incorrectly.             |
| Student shares or bookmarks an external Meet URL             | The app must not claim that its UI can revoke a copied provider URL. Use provider-side controls and, if revocation is required, a short-lived authorized redirect or integrated room. | Threat-model review and provider-specific manual acceptance.                                                                     |
| Student changes account, has a stale tab, or opens many tabs | Every list/join request checks the authenticated subject and appointment ownership on the server; caches and signed URLs are account-scoped.                                          | Two-account browser and API tests; direct-object-reference attempts; late response/revocation tests.                             |
| API, proxy, or scheduler sends malformed data                | API validates its own schema and maintains a published contract; the client fails closed as a second line of defense.                                                                 | Consumer contract tests plus client parser tests.                                                                                |
| A provider fails, host is absent, or student is disconnected | No automatic attendance, no-show, score, or AI fallback is recorded. The next owner and reschedule path are explicit.                                                                 | Fault injection and human-operational walkthrough.                                                                               |

## Security requirements outside this frontend

The frontend cannot authorize access to a meeting. Before production, the backend and operations owners must verify:

1. Object-level authorization on every appointment and join request; no client-supplied student, appointment, course, or role identifier may establish access.
2. Short-lived, non-cacheable join authorization with schedule-revision and enrolment checks at request time. A raw third-party meeting URL cannot be made revocable by React once copied.
3. Audit events for schedule, reschedule, cancellation, join-link issuance, feedback, and release; do not log raw provider URLs, access tokens, student instructions, or transcripts to analytics.
4. Per-account/IP rate limits, WAF/edge protections, query limits, bounded payload sizes, database indexes, connection-pool limits, and back-pressure that keep an arrival burst from cascading into the interview system.
5. Separate permissions for scheduling, attending, feedback, reviewing, and releasing student-visible outcomes. Navigation visibility is not authorization.
6. Disaster recovery for queued invitations/reminders: retry delivery idempotently, suppress stale schedule revisions, and surface delivery failure without deleting the in-app appointment.

## Automated coverage added here

- Valid/malformed appointment payloads, schedule ordering, status/join invariants, response-size bounds, and meeting-URL allowlisting are unit tested.
- Rapid double-click join requests are component tested.
- Existing tests cover account-switch and stale asynchronous join-response behavior.

The repository's existing local concurrency audit is useful evidence at a small scale, but it is not a 1,000-student production capacity result. Load, provider, mobile, and authorization acceptance must be executed in an isolated staging environment with synthetic accounts and no real meeting data.
