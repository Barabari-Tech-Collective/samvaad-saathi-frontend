# Build 26 — verified submission and feedback preparation recovery

Implemented 20 October 2026 in the student release candidate. Production remains unchanged.

## Acceptance-review finding

The completion page previously claimed all answers were saved and automatically posted a feedback-generation request before verifying the owned session's status. Its mount flag was not scoped to the student or sitting; URL role text entered the confirmation heading, and delayed write callbacks could navigate a departed context. These are concrete post-submission acceptance gaps, so this batch fixes them before claiming that journey is ready.

## Delivered behavior

A completion link must contain a canonical positive safe-integer sitting ID and an authenticated account. Invalid IDs issue no interview requests. The page remounts on account or sitting change, and account-scoped, abortable reads verify the owned receipt/status endpoint first. Active, paused, preparing, expired, terminated and unsupported statuses do not become completion confirmations and do not trigger this page's report checks or preparation. Receipt denial, missing ownership, service failure and malformed data produce explicit recovery instead of claiming nothing was lost.

The confirmed practice/assessment label comes from the owned API response. URL role text cannot invent a passed result or change the mode. A completed legacy session with no receipt remains completed, but its saved-answer counts are explicitly unavailable.

Receipt counts must be nonnegative safe integers, with a positive plan, each part bounded by the plan and answered + skipped + unresolved + unreached equal to planned. Completed receipts cannot contain unresolved/unreached questions. Supported reasons and optional version, sitting identity and presented-count metadata are checked. Zero saved answers remain zero. The shared receipt renderer also applies these checks, and hides previous details while refreshing. This validates the response contract; it does not independently inspect every stored audio object.

After owned completion is verified, the page reads existing feedback. A valid saved report opens without regeneration. Missing feedback offers an explicit Prepare feedback action; page loads/reloads no longer automatically create report-generation requests. Denied, failed or malformed report reads must be checked again and do not offer preparation. The core report-envelope check is shared with the report view, so a generic HTTP 200 object is not presented as valid feedback.

Preparation is guarded against rapid duplicate clicks. Its successful response navigates only while the same view remains mounted and completion remains verified; the report view then performs its own read and validation. Errors leave a visible uncertain state rather than claiming feedback is merely delayed. The student must check for an existing report before another request is offered. If it is still missing, the page explains that an earlier request may still finish and another preparation can repeat processing. There is no application-level automatic mutation retry.

## Limits

An accepted server request may finish after navigation, timeout or account change. This build prevents stale UI side effects, not the server work. It does not introduce durable cross-device generation idempotency, a background job queue, polling, guaranteed exactly-once provider execution or a new server-side generation authorization rule. Existing backend authorization/feature rules remain authoritative. A missing report after a check does not prove that no earlier provider request is still running. Existing token-refresh behavior is unchanged.

The page does not complete, reopen, reclassify or regenerate interview questions. It does not replace microphone/camera/provider/device acceptance. Legacy missing counts remain unknown rather than fabricated. Core report-envelope validation still relies on backend schemas for deeper nested report data.

## Verification

- 197 student unit tests passed, including 22 new receipt/envelope contracts.
- The full student Chromium suite passed 63 cases, including 26 new completion cases. After the final spacing adjustment, the 26 completion cases passed again.
- TypeScript, full ESLint, Prettier/diff checks and webpack production build passed.
- Cases cover malformed/missing/unsafe IDs, six non-completed statuses, misleading URL labels, time-limit receipts, legacy no-receipt sessions, receipt 403/404/503, contradictory counts, report 403/503/malformed 200, accepted-but-unconfirmed generation, late account changes, sitting changes, rapid duplicate clicks and completion access failure during preparation. Existing history, voice recovery, practice and guide tests remain included.
- Actual completion UI screenshots at 320px and 1280px were reviewed; 320px has no horizontal overflow. These use synthetic local identity/API data, not the authenticated production shell or live providers.

No backend, dashboard, central, schema, role-grant, AWS or production change. Their unchanged suites were not rerun. The preexisting untracked student ops/**pycache** files are left untouched.

## Next gates

Coordinated authenticated central/Sampark acceptance, real audio/provider and device behavior, screen readers, representative load and rollout/rollback remain required. Seven historical staff course assignments still need approved mappings; no grants were guessed. AWS relocation stays deferred; companion/media/Jev retain their separate scope. Build 26 is the tenth batch against the post-Build-16 estimate in REMAINING-DELIVERY.md, not a reset of that estimate.
