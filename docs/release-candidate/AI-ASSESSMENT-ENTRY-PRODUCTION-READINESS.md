# AI assessment entry: production readiness

## What this student release protects

- The role catalogue is treated as untrusted input. The browser rejects a malformed response,
  duplicate role IDs, unsupported interview modes or difficulties, invalid timestamps, and a
  response with more than 100 rendered roles. It does not guess a formal-assessment role or a
  published question count.
- An invalid, zero, non-integer, or out-of-policy question count is normalized to unavailable.
  The student cannot use it to create a smaller, larger, or default five-question assessment.
- The role selector uses the current published profile (not the role title encoded in a DOM value).
  If a re-fetch removes a role or changes it to the other mode, the current selection is cleared.
- Automatic focus and reconnect re-fetches are disabled. This prevents a whole lab returning to
  their tabs from generating an unnecessary burst of catalogue calls; a deliberate retry remains
  available after an access rejection or loading failure.
- Rapid clicks, account changes, uncertain network writes, and malformed create responses remain
  guarded by the existing single-submit, account-revision, History-recovery, and exact mode/count
  checks.

## Backend requirements before launch

These are not guarantees supplied by the browser. The create endpoint must enforce every one.

1. Resolve the student's assignment server-side. A known `jobProfileId`, client `mode`, question
   count, role name, or URL must never grant assessment access. Require an active student-specific
   assignment, its availability window, the correct organisation, and the assignment's stored
   mode and rubric.
2. Use a transaction and an idempotency key for creation. An assignment must have a documented
   policy for a second request (return the existing in-progress sitting, or create a permitted new
   attempt). Do not create two formal sittings when a mobile retry races a tab retry.
3. Keep the profile list paginated or searchable on the server, with a maximum page size of 100.
   The current browser intentionally rejects a larger page rather than rendering an unbounded
   menu. Return only roles the authenticated student can see; do not make this a shared public
   cache because assignments are private.
4. Apply per-account and per-IP rate limits to catalogue and create calls, plus a bounded database
   connection pool. Cache safe catalogue queries at the application layer and move expensive AI
   preparation to a queue or pre-generated assignment snapshot; never hold an HTTP transaction
   open while generating questions.
5. Revalidate assignment state at interview start and every privileged assessment mutation. Use
   immutable, server-stored question snapshots and authoritative server time. Record audit events
   for assignment changes, creation decisions, rejections, and idempotency replays without putting
   answer or resume content into logs.
6. Return a minimal, canonical creation response: a valid sitting ID, the server-stored mode, and
   the exact planned count. Authorize the subsequent interview-read request separately.

## Load and abuse checks to run in staging

- Simulate 1,000 concurrent authenticated students loading the page, then reconnecting or
  attempting a start within the same minute. Measure p95/p99 catalogue and creation latency,
  error rate, connection-pool saturation, queue delay, cache hit rate, and rate-limit false
  positives. Run the same test with a deliberately slow AI provider.
- Race two or more creation requests bearing one idempotency key, plus requests from separate tabs
  and a delayed network response. Verify exactly the policy-approved number of sittings exists.
- Attempt cross-organisation profile IDs, expired/revoked assignments, changed availability
  windows, tampered modes/counts/difficulties, stale tokens, forged catalogue values, and replayed
  completed-sitting URLs. Each must be denied server-side and audited without revealing whether
  another student has an assignment.
- Verify role updates propagate predictably: a re-fetch must remove a revoked role, while an
  already-created sitting stays readable only under its stored policy. Test cancellation at the
  boundary of the availability window using server time.

## Frontend verification included

`tests/interview-catalogue.test.ts` covers bounded and malformed catalogue responses, duplicate
IDs and difficulties, unrecognised modes, bad dates, and invalid question counts. Existing entry
tests cover exact creation responses, single-submit behavior, account changes, rejected requests,
and uncertain network outcomes.
