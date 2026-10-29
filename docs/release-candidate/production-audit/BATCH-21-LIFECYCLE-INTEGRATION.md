# Batch 21 — Cross-product lifecycle, authorization and concurrency audit

24 October 2026. Isolated local verification, not production certification.

## Test boundaries

The actual local services are the Node central-auth and Sampark services under Sampark-Saathi-Backend, Python Samvaad API/worker, student Next application and Sampark dashboard. A separate Java checkout also exists but is not the running local system and its tests were not substituted for the active services.

No paid AI/speech or external AWS calls. No browser automation (disabled by user), physical mobile or native reader tests. No production deployment. Local smoke acceptance creates clearly labelled manual templates and synthetic storage fixtures; these are retained for local inspection by the existing smoke runner. Destructive integration fixtures run only against localhost:15432/ss_count_tests, never samvaad_local.

## Executed evidence

| Layer | Result | Limits |
|---|---|---|
| Student component/unit suite | 434 passed | No rendered browser/task acceptance |
| Dashboard bulk ATS suite | 17 passed | Not the entire dashboard |
| Central authentication | 47 passed, 6 suites | HTTP/repository mocks in unit tests; live sign-in separately covered |
| Central-auth and Sampark TypeScript | Passed | Compile checks only |
| Sampark unit suite | No tests found — coverage gap | Do not count as passed |
| Backend unit suite | 1,200 passed, 455 warnings | Warnings explicitly retained |
| PostgreSQL integration | 262 passed, 49 warnings after fix/new race test | Real SQL/ASGI; identities and external providers injected/mocked in many fixtures |
| Live local lifecycle smoke | 36 passed, 0 failed | Sign-in, scope, storage policy, manual authoring/publication; no complete voice interview |
| Live local concurrency | 108/108 passed, four real identities | Read-only; 4 and 12 in-flight requests, not production capacity |
| Concurrent permission updates | Passed | Real isolated PostgreSQL and ASGI, injected admin identity |

Logs use /tmp/samvaad-b21-*; sanitized concurrency details are copied into this directory.

## Lifecycle and role coverage

| Journey | Verified evidence | Still needed |
|---|---|---|
| Central sign-in/product bridge | Live student, facilitator, admin, superadmin sign-in; auth suite covers identity freshness and product access | Live revocation during a complete user journey, recovery flows in browser |
| Enrollment/course access | Live sync and allowed/forbidden facilitator course roster; SQL sync/scope tests | Every supported course/college combination under central revocation |
| Practice and formal authoring | Separate manual drafts, questions, submission, publication and immutable edit denial | Browser authoring, live AI generation quality and failure UX |
| Student practice/formal sessions | SQL question rounds, writer/receipt integrity, course access, history and retry suites | Real microphone/codec/network interruptions and complete student task walkthrough |
| Facilitator/program support | SQL coaching assignment, course support/reporting and multi-team identity/scope tests | Separate real program-team identity and role-specific dashboard walkthrough |
| Placement | SQL consented shortlist decisions, finalization races, scope and sharing withdrawal | Real placement account, job applications/offers/outcomes workflow |
| Admin/custom permissions | Personal access update/revoke/conflict/audit and non-admin denial; simultaneous stale writes produce one winner | Every central custom-role creation/assignment combination through dashboard |
| Impact mentors | No distinct live actor exercised | Establish supported role mapping and run genuine identity/scope/action matrix |
| Human interview | SQL schedule retry, double-book race, join window, host/enrollment revoke, no-show/version rules | Actual external Meet admission/reconnect and human interaction |
| Integrity review/appeal | SQL review/appeal tests executed | Complete reviewer/learner browser journey and real calibrated evidence |
| Job obtained → platform graduation | No explicit end-to-end transition located in examined service routes/entities | Define and implement job-outcome verification, completion approval, access/consent changes, alumni status and appeal/reversal |

Education graduationYear fields are not evidence of platform graduation. A shortlist or readiness score is not evidence of employment.

## Defects and test corrections

- Product fix: link JobProfile.questions and JobProfileQuestion.job_profile with back_populates. Previously SQLAlchemy warned of conflicting writes and inverse in-memory relationships were not synchronized. New test checks reassignment updates both collections.
- New regression: two simultaneous permission saves with expected_version=0 must return one 200 and one 409; stored permissions equal the winner, version increments once, and one audit event exists.
- Harness correction: CREATE DATABASE needs an autocommit connection outside psycopg2's transaction context. The initial runner stopped before fixture mutation; corrected and rerun.
- Harness correction: /me identity lives in authorizedUser.email, not top-level email. First concurrency pass had matching HTTP statuses but failed the incorrect identity assertion. Final run validates the actual envelope. This was not a product bug.

## Concurrent simulation

Four seeded identities: student, facilitator, admin, superadmin. Two waves, 54 requests each, concurrency 4 then 12. Includes identity payload checks, workspace allow/deny, admin-only people lists, student practice/review/human-interview reads, allowed and forbidden course rosters, and anonymous denial. No unexpected responses after the corrected assertion.

Observed p95: 66.0 ms at concurrency 4; 116.2 ms at concurrency 12. Max: 84.0 ms and 143.1 ms. These numbers describe this warmed local run only. No sustained throughput, live media, generation queues or large dataset claim.

## Remaining release blockers

No claim that the whole product is flaw-free or the learner lifecycle complete. Existing tracker engineering work remains open: orphan reconciliation, multi-transaction resume recovery, legacy drill creation/upload durability, broader callbacks/telemetry, independent Jev labels, verified historical staff mappings, and production backup/rollback/provider/device/load acceptance. Add central Sampark tests before treating that service as covered. Repeat authenticated scenario coverage for program, placement, mentor and custom role accounts, including concurrent revocation and mutation traffic. Do not infer their behavior from an admin token.

## Confirmed graduation requirement

The user confirmed: staff verifies job placement and course completion; admin approves graduation. See GRADUATION-WORKFLOW-SPEC.md. The policy is recorded but the lifecycle implementation is still missing, so this end-to-end segment remains failed readiness / unimplemented, not passed.
