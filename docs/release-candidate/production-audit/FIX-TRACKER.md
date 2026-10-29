> **25 October closure checkpoint:** See `CLOSURE-REVIEW-2026-10-25.md` in the product plan for this pass. Historical batch open rows repeat dependencies; delivery is consolidated in `REMAINING-MILESTONES.md`. Browser access briefly worked for the recorded fixture checks, then local browser access was denied again. Do not treat all 86 routes as verified.

> Current delivery queue: [consolidated milestones](/Users/armasahar/Desktop/samvaad-saathi-revamp-2026-10-18/REMAINING-MILESTONES.md). Historical unchecked entries overlap and are not a count of independent tasks.

# Fix tracker — Samvaad Saathi

Last updated: 24 October 2026. This is the current checklist. Earlier audit reports are historical evidence; status here takes precedence where explicitly updated.

**How to read it:** `[x]` means the specifically named task is complete locally. `[ ]` means it remains open. A code fix does not check off browser/device/provider acceptance or production deployment. Test evidence is required before checking a code task. Work through the consolidated engineering and design pass; add newly discovered defects instead of silently expanding “done.”

## Current queue

- [x] **01 — O01/D01: replace screenshot-based résumé profile save.** Profile save and download now use the same backend PDF source. Invalid/empty PDF responses fail before upload; rapid saves are guarded; edit/download disabled during save. Missing résumé fields no longer show fictional sample data. Nine new service/component regressions passed.
- [ ] **01a — Document acceptance:** authenticate locally and compare saved/downloaded documents; test Hindi/mixed fonts, links, long actual résumé pagination and multiple screen widths. Existing real PDF engine test verifies Latin text extraction/pagination only.
- [x] **02 — O04 shared-client/cache protections.** Fresh account cache/subtree, storage ownership, stale-response and refresh-race guards, cross-tab notifications/focus/polling implemented. 12 new tests; 363 student tests pass. [Batch details](BATCH-02-ACCOUNT-ISOLATION.md).
- [x] **02a.1 — Résumé PDF download/save account ownership.** Guard request dispatch, delayed results, downloaded PDF ownership and final-page callbacks. Five new regressions; 368 student tests pass. [Batch details](BATCH-03-RESUME-TRANSPORT.md).
- [x] **02a.2 — Profile/onboarding/résumé direct requests.** Account-owned polling, protected JSON body consumption, AI-analysis dispatch/results, and caller feedback guards implemented. Eight new regressions; 376 student tests pass. [Batch details](BATCH-04-DIRECT-REQUESTS.md).
- [x] **02a.3 — Meeting, interview entry and completion account guards.** Added page-owned revision checks around imperative reads/actions and delayed callbacks; previously verified Meet links block stale clicks. Eight new regressions; 384 student tests pass. [Batch details](BATCH-05-FEATURE-CALLBACKS.md).
- [ ] **02a — O04 remaining callback audit.** Broader delayed-action inventory and integration acceptance still open; do not infer complete isolation from these targeted fixes.
- [x] **02c.1 — Résumé data confirmation.** Replaced stale hasResume polling with validation of this upload’s saved/readable-text receipt. Failed/unconfirmed saves retain the file; onboarding reuses a confirmed upload on profile-step retry. 13 new tests; 397 student tests pass. [Batch details](BATCH-06-RESUME-READINESS.md).
- [x] **02c.2 — Backend exact-file reconciliation foundation.** Extraction receipts include the original-byte SHA-256; authenticated storage lookup matches both account and hash and returns registered/unconfirmed without exposing storage keys. Eleven new tests; 12 focused and 1,144 full backend unit tests pass. [Batch details](BATCH-07-RESUME-STORAGE-RECEIPT.md).
- [x] **02c.3 — Student receipt recovery panel.** Profile can recheck the latest acknowledged file without uploading again; account-owned fingerprint survives same-tab reloads when session storage is available. Eight new tests; 405 student tests pass. [Batch details](BATCH-08-STUDENT-STORAGE-RECOVERY.md).
- [x] **02c.4 — Pre-upload fingerprint recovery.** Profile/onboarding remember the original-byte fingerprint before dispatch, so a lost response can still be reconciled in the same tab session. Recovery panel also available in onboarding. Four new tests; 409 student tests pass. [Batch details](BATCH-09-PREUPLOAD-RECOVERY.md).
- [x] **02c.5 — Backend keyed extraction contract.** Durable account/key admission, completed receipt replay, conflicting/incomplete retry rejection and scoped status endpoint implemented. 21 focused and 1,155 backend unit tests pass; migration SQL generated only. [Batch details](BATCH-10-RESUME-OPERATIONS.md).
- [x] **02c.6 — Local concurrency acceptance and client keys.** Migration applied only to guarded localhost samvaad_local. Real PostgreSQL duplicate admission/replay/conflict test passed; frontend sends retained current-file operation keys and displays operation status. 417 student tests pass. [Batch details](BATCH-11-KEYED-CLIENT.md).
- [x] **02c.7 — Authenticated local HTTP acceptance.** Real central sign-in and PostgreSQL, synthetic ASGI extraction, multipart/header/replay/duplicate/account-isolation checks passed. Recorded local API restarted and live status/isolation/replay verified without provider calls. [Batch details](BATCH-12-RESUME-HTTP-ACCEPTANCE.md).
- [x] **02c.8 — Explicit failed/unsaved retry preparation.** Account-scoped recovery returns one stable child key; UI prepares it without uploading. Unresolved and saved operations remain blocked. 420 student / 1,163 backend tests pass. [Batch details](BATCH-13-EXPLICIT-RECOVERY.md).
- [x] **02c.9 — Explicit storage-only repair.** Confirmed saved extractions can restore exact original bytes without AI/profile writes; existing records short-circuit and concurrent repairs serialize per account. UI exposes Restore file only. 422 student / 1,173 backend tests pass. [Batch details](BATCH-14-STORAGE-ONLY-REPAIR.md).
- [x] **02c.10 — Durable database staging and storage delivery foundation.** Bounded original bytes, skip-locked worker claims, retry/expiry cleanup and real local PostgreSQL interruption/concurrency acceptance implemented. 1,186 backend unit tests pass (456 warnings). [Batch details](BATCH-15-DURABLE-STORAGE-DELIVERY.md).
- [x] **02c.11 — Student-visible delivery state.** Account-scoped pending/failed/expired receipts, expiry before cleanup, registry precedence and recovery UI implemented. Pending delivery suppresses manual restore. 429 student / 1,192 backend tests and real local PostgreSQL acceptance pass. [Batch details](BATCH-16-DELIVERY-STATUS.md).
- [x] **02c.12 — Live local API/worker activation.** Verified recorded-process restart, live authenticated delivery status/account isolation, and real arq startup cleanup of an expired synthetic job. Existing HTTP replay/recovery regression passes. [Batch details](BATCH-17-LOCAL-RUNTIME-ACCEPTANCE.md).
- [x] **02c.13 — Real local object-store delivery/recovery.** Exact-byte upload/read, anonymous denial, deduplication, real missing-bucket failure/retry and three-failure exhaustion pass; synthetic fixtures cleaned and worker restored. Three local guard regressions pass. [Batch details](BATCH-18-LOCAL-OBJECT-STORAGE.md).
- [x] **02c.14 — Stable-object crash replay.** Durable staging reuses an account/hash key and preserves it after uncertain database outcomes. Actual local child exit after upload, followed by same-key recovery, passes. 1,199 backend unit tests pass (456 warnings). [Batch details](BATCH-19-CRASH-REPLAY-STORAGE.md).
- [ ] **02c — Durable original-file storage/recovery.** Database staging/worker delivery and client-visible status exist; full crash/object-storage acceptance and production operational validation remain open; local API/worker activation passed. Add exact-upload reconciliation for delayed/failed storage and ambiguous extraction timeouts/reloads; frontend receipt validation does not close this item.
- [ ] **02b — O04 actual browser acceptance.** Two identities/tabs, Back/bfcache, suspended tabs, permissions and fresh login. Browser testing is now user-authorized but the tool still reports it disabled in Work settings; overall O04 is not fully closed.
- [ ] **03 — O02: legacy drill creation idempotency across reloads.** Add server reconciliation and transaction tests.
- [ ] **04 — O03: legacy drill upload/recovery durability.** Handle ambiguous upload outcomes and retained audio safely.
- [x] **05a — Generic error/replay privacy hardening.** Raw generic exceptions/context, profile field values and free-text report errors removed from targeted analytics paths; automatic capture/replay explicitly disabled. Regression tests pass. Broader event/log audit remains open. [Batch details](BATCH-20-PRIVACY-AND-DESIGN.md).
- [ ] **05 — O05: remaining telemetry/privacy paths.** Review generic exception capture, ad hoc logs and session replay.
- [ ] **06 — O09: complete authenticated integrity reviewer/appeal acceptance.** Exercise races, scope revocation and audit history.
- [ ] **07 — O06/O07: media and Google Meet acceptance.** Real codec, permission interruption, account/admission and reconnect tests.
- [ ] **08 — O10: rendered responsive/accessibility acceptance.** See design checklist below; browser testing is user-authorized but blocked by the actual Work setting; phone/native reader unavailable.
- [ ] **09 — O08: independent Jev labels and empirical evaluation.** Collection workflow is not a calibrated dataset.
- [ ] **10 — O11: representative load/fault/provider acceptance.** Agree synthetic workload and cost ceiling before execution.
- [ ] **11 — O12: verified production scope/historical mapping.** Do not guess unknown staff/course or historical interview mappings.
- [ ] **12 — O13: remaining broader publication/adaptive/human workflow scope.** Follow completion ledger and verify each supported capability.
- [ ] **13 — Release acceptance and production rollout.** Exact candidate CI, backup/restore, rollback and controlled pilot. No deployment in this batch.

- [ ] **14 — Central multi-product authentication and navigation:** implement CA01–CA10 from `/Users/armasahar/Desktop/samvaad-saathi-revamp-2026-10-18/CENTRAL-AUTH-AND-PRODUCT-ROUTING.md`; shared Home, scoped staff entry, secure product switching and global session lifecycle. 29 acceptance cases planned, not executed.

## Central authentication foundation — CA-B01

- [x] Atomic v1 authorization/magic code consumption, login/access-request purpose separation and current-account guards.
- [x] Opt-in v2 authorization/exchange: configured central redirect, PKCE/product/callback/session binding and fail-closed denial/replay handling.
- [x] 49 new auth tests; 96 total pass. Real isolated Redis concurrency and expiry verified; TypeScript passes.
- [ ] Product transaction/BFF, Home UI, unified staff SSO, all-product switching, global session revocation and end-to-end browser acceptance.

Evidence: `/Users/armasahar/Desktop/samvaad-saathi-revamp-2026-10-18/CENTRAL-AUTH-BUILD-01.md`. Code foundations checked above do not close overall item 14 or the 29 end-to-end cases.

## Product-side login transactions — CA-B02

- [x] Independent Redis/browser-bound login transactions with atomic conditional consumption, TTL and fail-closed errors; backend flag defaults off.
- [x] Safe return-path propagation through the legacy frontend callback; fresh callbacks precede old cookies; no fixed redirect delay.
- [x] 30 focused backend cases including actual local Redis; 22 new frontend cases and 456 total frontend tests pass. TypeScript passes.
- [ ] Replace legacy URL-token handoff with v2/BFF sessions; carry destination through onboarding; integrated browser/account-switch/logout acceptance.

Evidence: `/Users/armasahar/Desktop/samvaad-saathi-revamp-2026-10-18/CENTRAL-AUTH-BUILD-02.md`. This does not close overall central-auth item 14.

## Cross-product integration and concurrency — 24 October

- [x] Central authentication unit suite: 47 tests; active auth and Sampark services typecheck.
- [x] Student 434 tests, staff bulk-ATS 17 tests, backend 1,200 unit tests (455 warnings).
- [x] Isolated PostgreSQL/ASGI integration: 262 tests passed, 49 warnings after the relationship fix and new permission race regression.
- [x] Live local lifecycle smoke: 36 checks, including central identity, course scope and manual practice/formal publication.
- [x] Four-identity read-only concurrency: 108 requests, waves of 4 and 12 concurrent requests, all expected status and identity assertions pass.
- [x] Concurrent personal permission edits: one successful versioned write, one conflict and one audit event.
- [x] Job-profile/question inverse relationship corrected and reassignment regression passes.
- [ ] Complete live journey through verified employment and platform graduation: no explicit lifecycle located; eligibility approved: staff verifies job placement and course completion; admin approves. Implementation and acceptance pending.
- [ ] Sampark service unit coverage: suite contains no tests.
- [ ] Live distinct program-team, placement-team, impact-mentor and custom-role workflows; current live simulation covers only four seeded roles.
- [ ] Sustained concurrent mutation/media/provider workload and browser/device acceptance.

See [lifecycle matrix and evidence](BATCH-21-LIFECYCLE-INTEGRATION.md). These checks do not close broader release gates above.

## Staff modal and error-state repair — 24 October

- [x] **D12-code / question dialogs:** shared accessible primitive, focus return, labels, bounded scrolling and stacked narrow controls; six DOM-simulator regressions pass.
- [x] **D18-code / authoring submission:** immediate Add/Save lock, blank/published guards, disabled pending fields and preserved failed draft. Durable reload idempotency remains separate.
- [x] **D24-code / question controls:** named expansion/search/clear actions, expanded state, larger targets and restored keyboard focus indicator.
- [x] **D10-code / authoring metadata:** targeted question-card/detail/review label size and color improvements.
- [x] **D12-code / team dialogs:** recycle-bin and deletion overlays moved to shared dialog; deletion duplicate/pending/failure handling improved. Actual page focus/viewport acceptance remains open.
- [x] **D17-code / recycle bin:** failed/malformed requests show errors; auth/server failures do not trigger legacy fallback; stale reads ignored. Eight service regressions pass.
- [ ] Rendered acceptance for the above at phone/tablet/desktop widths, zoom, nested dialogs and keyboard navigation. User has authorized browser testing; Work settings still deny access.

Evidence: [batch 22](BATCH-22-STAFF-MODALS.md). 45 dashboard Node tests, 6 cross-product dialog tests, 434 student tests and both typechecks pass. Three checks covered this change set, not the entire tracker.

## Previously completed local hardening

All F-items below were fixed in the prior audit pass. Their detailed limits remain in [FINDINGS.md](FINDINGS.md); source-only layout changes still need visual acceptance.

- [x] **F01 / P1 security** — Put markup-like text into a résumé/provider field, then download analysis HTML.
- [x] **F02 / P1 privacy** — Cause an API error carrying a request config/body.
- [x] **F03 / P1** — Direct-link pronunciation start with missing/corrupt/structurally invalid sessionStorage.
- [x] **F04 / P1** — Open a pronunciation URL with query parameters repeatedly.
- [x] **F05 / P1** — Double-click Start, block storage, fill quota after creation, or leave before response.
- [x] **F06 / P1** — Grant microphone after leaving/changing drill.
- [x] **F07 / P1** — Stop and immediately submit, or use a browser recording MP4.
- [x] **F08 / P1** — Navigate to a new pacing level while old creation is delayed; use invalid numeric query.
- [x] **F09 / P1** — Complete old structured upload after moving to a different section.
- [x] **F10 / P1** — Logout with browser storage access disabled.
- [x] **F11 / P2 accessibility** — Navigate microphone or profile-guideline modal with keyboard/reader.
- [x] **F12 / P2 product trust** — Select role or expect recording/scoring in pronunciation.
- [x] **F13 / P2 navigation/media** — Finish pronunciation, replay repeatedly or change word during playback.
- [x] **F14 / P2 responsive** — See student-table loading fallback on a narrow staff page.
- [x] **F15 / P2 legibility** — Read staff tags, small studio labels and résumé note affordance.
- [x] **F16 / P2 layout** — Load structured practice/report inside shell on phone/landscape.
- [x] **F17 / P1 security** — Download backend résumé PDF containing markup, unsafe link schemes or quote-breaking text.

## Verified design code fixes — acceptance tracked separately

- [x] **D08-code:** readable on-screen résumé typography and honest PDF-pagination label; PDF generation unchanged.
- [x] **D09-code:** readable, wrapping upload guidance and external layout-example explanation.
- [x] **D10-code (four screens):** Roles, Teams, team detail and MemberModal typography/colors improved. Question-authoring screens remain open.
- [x] **D24-code (résumé selection):** focusable file control, named 44px replacement action and associated validation alerts; selected/uploaded distinction corrected.

Student: 434 tests, TypeScript and targeted lint pass. Staff TypeScript and 17 bulk-ATS tests pass. See [batch 20](BATCH-20-PRIVACY-AND-DESIGN.md). These do not close rendered/native acceptance below.

## Design follow-through

These checkboxes mean the whole design item is accepted. Source fixes alone stay unchecked until the relevant real UI check is complete. See [DESIGN-AUDIT.md](DESIGN-AUDIT.md) for device/state matrix and pass criteria.

- [ ] **D01 / P1** — Résumé final profile save: screenshot PDF; `ai-resume/final/page.tsx`. Status: Code updated in batch 01; document/browser acceptance pending.
- [ ] **D02 / P2** — Pronunciation setup copy and backend difficulty-only generation. Status: FIXED copy/control; observe students understand listen-and-repeat scope.
- [ ] **D03 / P2** — Pronunciation arbitrary welcome hold/final Next label. Status: FIXED; words open immediately; final Finish practice action.
- [ ] **D04 / P1 accessibility** — Microphone permission overlay; résumé link guidelines. Status: FIXED native named modal and controls; actual focus, Escape and return remain pending.
- [ ] **D05 / P2** — `dashboard/.../tag-badge.tsx`, studio eyebrow, résumé Note. Status: FIXED specific components; verify rendered contrast/wrapping at 200% text.
- [ ] **D06 / P2** — Staff student-table skeleton outside table viewport. Status: FIXED hard minimum; verify no layout shift on resolution.
- [ ] **D07 / P2** — Structured drill report/loader fixed 80vh and nested min-h-screen. Status: FIXED growable layout; verify short landscape and long error text.
- [ ] **D08 / P2** — `ai-resume/final/page.tsx` 10–11px document preview typography. Status: on-screen source fixed in batch 20; real document/viewport acceptance pending.
- [ ] **D09 / P2** — `ai-resume/preview/page.tsx` 9px Layout example badge, input-form 10px label. Status: source fixed in batch 20; rendered acceptance pending.
- [ ] **D10 / P2** — Multiple staff Roles/Teams/MemberModal labels/errors use 10–11px and pale gray. Status: OPEN targeted typography/contrast review; permission labels and denial/errors take priority over chart ticks.
- [ ] **D11 / P1 usability** — Large bulk ATS table (`min-w-[1120px]`) and interview tables (`min-w-[1000px]`). Status: Source already uses named keyboard-focusable table viewport; **not automatically a WCAG failure**. Verify sticky identity/action, visible scroll affordance and a task-focused narrow alternative.
- [ ] **D12 / P1** — All dialogs under phone keyboard and short landscape. Status: PENDING actual viewport/keyboard testing; content scrolls, header/actions remain reachable, no background interaction.
- [ ] **D13 / P2** — Brand + menu + Back + profile + expanded/collapsed nav. Status: Existing shell separates task Back and nav toggle; visual check at 320/360 and every breakpoint, with long title/font fallback.
- [ ] **D14 / P2** — Mobile More hides secondary tasks. Status: Keep core 3 tasks stable; test findability, active More state, labels and route focus without coaching.
- [ ] **D15 / P1** — Errors during capture/convert/save. Status: New targeted errors/statuses in drills and storage flows; audit remaining ad hoc catch blocks before calling all flows fixed.
- [ ] **D16 / P2** — Recording playback and companion animation. Status: Targeted replay cleanup; test mute/hide/reduced motion and no late voice after leaving.
- [ ] **D17 / P2** — Empty state versus request failure versus access denied. Status: Verify separate states and next action in every route; no invented score, streak or ranking.
- [ ] **D18 / P1** — Permission revoke or stale publication while editing. Status: Show stable denial/conflict with preserved permitted draft; API remains authority.
- [ ] **D19 / P2** — English/Hindi, long course/person/role names and URLs. Status: Use Noto Sans Devanagari fallback, adequate line height and full-label access; rendered inspection pending.
- [ ] **D20 / P1** — Sticky headers/bottom navigation/guide popover. Status: Matrix must verify footer clearance and no overlapping coachmarks; presence of safe-area CSS is not proof.
- [ ] **D21 / P2** — Too many large empty panels and headings above primary task. Status: Task-first small-screen ordering already implemented; observe task completion and use real data/no-data cases.
- [ ] **D22 / P2** — Status chips, scores and chart colors. Status: Text/icon labels, table alternatives and measured computed styles; no color-only meaning.
- [ ] **D23 / P1** — Browser-level validation, selected controls, route titles and live status. Status: Legend/pressed/current state improvements; all actual announcements need native-reader acceptance.
- [ ] **D24 / P2** — Hover-only hints, icon actions and tiny pagination. Status: Tooltips supplementary only, persistent labels for critical actions, names for icons, sufficient touch targets.
- [ ] **D25 / P2** — New student design versus inherited central/staff routes. Status: 86-route inventory covers these surfaces; shared semantic tokens/components should migrate by task, not global override guesses.

## Test execution and evidence

- [x] Batch 01: nine new PDF service/component tests pass (`resume-document-service.test.ts`, `resume-profile-save.test.tsx`).
- [ ] Execute and record integrated outcomes for the [85-case register](test-cases.csv); do not check the entire register based on unit-test counts.
- [ ] Complete the [86-route rendered matrix](route-inventory.csv).

## Change log

| Date / batch | Completed work | Evidence | Still open |
|---|---|---|---|
| 22 Oct / audit baseline | F01–F17 local fixes | 342 student, 1,133 backend unit, 37 dashboard tests; student build and both typechecks passed | Rendered/provider/device/integrated gates |
| 22 Oct / 02 | Account-owned cache/subtree, draft boundary, stale response/refresh guards and tab signals | 12 new tests; 363 student tests, optimized build, TypeScript and lint passed | 02a transport audit and 02b actual browser acceptance |
| 22 Oct / 01 | Canonical PDF profile save, duplicate-action guard, meaningful failure/retry, no fictional preview fallback | 351 student tests passed (9 new); optimized build, TypeScript and diff checks passed; lint has 0 errors/1 existing warning | 01a document acceptance; 02 next |

## Product PKCE and handoff — CA-B03

- [x] V2 product exchange uses server-held PKCE verifier and stored callback/product; protocol changes fail closed.
- [x] Browser-bound one-use handoff removes token pairs from v2 redirect URLs; exact Origin, expiry and atomic redemption checks.
- [x] Frontend handoff handling, account-revision guard, old-cookie callback routing and denial fallback.
- [x] 55 focused backend/real-Redis cases, 462 frontend tests, TypeScript and whitespace checks passed.
- [ ] BFF/server-held sessions and removal of legacy URL-token delivery.
- [ ] Live browser/CORS/cookie acceptance and controlled activation; central Home, unified staff entry and global logout remain open.

See the product plan's CENTRAL-AUTH-BUILD-03.md for scope, configuration and limitations.

## Encrypted server-held session lifecycle — CA-B04

- [x] Server-only encrypted session store, hashed opaque identifiers and explicit rotating keys.
- [x] Bounded lifetime, atomic refresh reservation/commit and revocation that cannot be undone by late refresh.
- [x] 34 new unit/actual-Redis cases; 89 combined login/session cases passed.
- [ ] HTTP cookie/CSRF boundary, credential refresh transport and existing identity/authorization integration.
- [ ] Frontend token-removal migration, BFF browser acceptance, global logout and controlled activation.

See CENTRAL-AUTH-BUILD-04.md in the product plan. This is a tested foundation, not an active server-session login.

## Server-session HTTP lifecycle — CA-B05

- [x] Default-off completion/status/logout endpoints with secure host-only cookie and no token-pair responses.
- [x] Exact Origin, existing-session CSRF, central identity/revocation and safe failure handling.
- [x] 34 new cases and 123 combined auth/session tests, including real Redis with ASGI lifecycle acceptance.
- [ ] Frontend and product API transport migration; server-side refresh and cross-tab response-ordering acceptance.
- [ ] Live central/browser/CORS acceptance and activation. Existing bearer login is unchanged.

See CENTRAL-AUTH-BUILD-05.md in the product plan.

## Server refresh and cookie dependency — CA-B06

- [x] Server-side refresh endpoint with Origin/CSRF checks, strict transport validation and no token-pair response.
- [x] Durable dispatch marker prevents reuse after ambiguous refresh/process crash; logout and expiry prevent late commit.
- [x] Opt-in cookie dependency preserves existing current-user checks; resource permissions remain required.
- [x] 24 new cases; 147 combined auth/session tests including actual Redis passed.
- [ ] Attach dependency to reviewed product routes alongside complete frontend transport/account-isolation migration.
- [ ] Staff refresh, live provider/browser acceptance, global logout and activation remain open.

See CENTRAL-AUTH-BUILD-06.md in the product plan.

## Stale refresh cleanup — CA-B07

- [x] Replace unconditional refresh-failure revocation with atomic encrypted-record comparison.
- [x] Preserve newer sessions after stale-worker cleanup or identity mismatch; keep explicit logout unconditional.
- [x] Seven regressions added, including two real Redis race/cleanup cases.
- [ ] Frontend/product-route migration remains pending; this corrective batch does not activate cookie authentication.

See CENTRAL-AUTH-BUILD-07.md in the product plan.

## First cookie product read — CA-B08

- [x] Token-free GET /auth/session/me uses existing identity/access checks and shared profile metadata.
- [x] Legacy /me token contract preserved; cookie route cannot fall back to bearer auth.
- [x] Dependency errors receive private/no-store responses; eight regressions passed.
- [ ] Frontend and remaining product-route migration, live browser acceptance and activation remain open.

See CENTRAL-AUTH-BUILD-08.md in the product plan for exact test evidence.

## Twenty-item session boundary batch — CA-B09

- [x] **01.** Configured session URLs reject whitespace/control characters and backslashes before parsing.
- [x] **02.** Configured session URLs reject malformed, out-of-range and zero ports.
- [x] **03.** Configured session URLs reject query strings, fragments and embedded credentials.
- [x] **04.** Duplicate Origin headers are rejected rather than trusting parser order.
- [x] **05.** Explicit cross-site Fetch Metadata is rejected even when the Origin header matches.
- [x] **06.** Duplicate session-cookie names are rejected before session lookup.
- [x] **07.** Duplicate handoff-cookie names are rejected before redemption.
- [x] **08.** Duplicate CSRF headers cannot authorize account replacement, refresh or logout.
- [x] **09.** CSRF input is bounded to 128 characters before constant-time comparison.
- [x] **10.** Completion payloads forbid extra client-supplied identity/token fields.
- [x] **11.** Completion return destinations are normalized again before being returned.
- [x] **12.** Unexpected session-route exceptions become generic non-cacheable service errors.
- [x] **13.** Existing Vary response dimensions are preserved; Origin and Cookie are added.
- [x] **14.** Session responses include X-Content-Type-Options: nosniff.
- [x] **15.** Encryption key history is bounded to one through three keys, and duplicate keys are rejected.
- [x] **16.** Wrong-type and oversized encrypted records fail closed before decryption.
- [x] **17.** Decrypted session records require exactly the supported fields.
- [x] **18.** Principal length/whitespace and token/CSRF size limits apply at session creation, decoding and refresh where relevant.
- [x] **19.** Handoff issuance rejects empty/oversized credentials and normalizes the destination before storage.
- [x] **20.** Handoff redemption validates credentials, normalizes the destination and returns only the three supported fields.

38 new regression cases passed. See CENTRAL-AUTH-BUILD-09.md for exact suite evidence and remaining integration work. No activation or deployment.

## Twenty-item browser lifecycle client — CA-B10

- [x] **01.** HTTPS-only API base validation rejects embedded credentials, query strings, fragments and whitespace.
- [x] **02.** Lifecycle requests always include the HttpOnly session cookie through credentials: include.
- [x] **03.** Lifecycle fetches explicitly disable caching.
- [x] **04.** HTTP redirects are rejected instead of following credentialed requests to a new destination.
- [x] **05.** AbortController timeouts bound lifecycle requests and produce recoverable errors.
- [x] **06.** JSON responses must be object envelopes; malformed bodies fail without exposing server content.
- [x] **07.** Top-level bearer-token fields in lifecycle responses are rejected.
- [x] **08.** Status validates authenticated identity and bounded CSRF metadata.
- [x] **09.** Session metadata and CSRF remain in memory; no localStorage, sessionStorage or bearer-cookie writes.
- [x] **10.** Snapshot callers receive copies and cannot mutate client session state.
- [x] **11.** Principal changes increment the local account revision.
- [x] **12.** CSRF changes detect replacement sessions even for the same account.
- [x] **13.** Explicit invalidation clears state and invalidates in-flight results for cross-tab integration.
- [x] **14.** Epoch checks before fetch, after response and after JSON parsing reject stale results.
- [x] **15.** Completion validates handoff ticket shape before network dispatch.
- [x] **16.** Completion hydrates existing-session CSRF before attempting account replacement.
- [x] **17.** Completion sanitizes return destinations and waits for later status to establish principal identity.
- [x] **18.** Concurrent completion/logout mutations are blocked; status is blocked during those mutations.
- [x] **19.** Concurrent refresh callers share one promise; busy responses trigger one status check, not an unbounded retry loop.
- [x] **20.** Expired-session CSRF supports logout after reload; failed logout preserves local state, confirmed logout clears it and late refresh cannot restore it.

36 new tests; 498 frontend tests, TypeScript and targeted release lint passed. Live UI and product transport integration remain unchecked. See CENTRAL-AUTH-BUILD-10.md.

## Twenty-item cookie-profile transport — CA-B11

- [x] **01.** Added an explicit cookie-profile read method targeting only /auth/session/me; no arbitrary caller URL.
- [x] **02.** Profile requests hydrate verified session status when client identity is unknown.
- [x] **03.** Anonymous status stops profile dispatch instead of trying bearer fallback.
- [x] **04.** Profile requests send X-Session-Principal from verified client session metadata.
- [x] **05.** Backend compares expected principal with the actual cookie session before loading user/profile data.
- [x] **06.** Backend rejects duplicate expected-principal headers rather than trusting parser order.
- [x] **07.** Concurrent non-cancellable profile callers share one in-flight read.
- [x] **08.** Shared-read consumers receive independent result and role-array copies.
- [x] **09.** Completed profile data is not retained as a permanent client cache.
- [x] **10.** Explicit invalidation clears the shared profile flight so a new account cannot reuse it.
- [x] **11.** Old-flight cleanup cannot clear a replacement flight.
- [x] **12.** 401 profile reads invoke one coordinated refresh followed by at most one read retry.
- [x] **13.** A second 401 stops retries and invalidates client identity.
- [x] **14.** 403 profile denial invalidates identity without attempting token refresh.
- [x] **15.** 409, 429 and server errors are surfaced without automatic replay loops.
- [x] **16.** Account revision changes during refresh prevent retry under the replacement account.
- [x] **17.** Optional AbortSignal rejects pre-cancelled work and links cancellation to the fetch controller; listeners are removed afterward.
- [x] **18.** Cancellation after status hydration or body parsing discards results; cancellation errors do not falsely log out the account.
- [x] **19.** Profile response validation rejects nested token fields, invalid user IDs, non-boolean permission flags, invalid attempt counts and malformed role arrays.
- [x] **20.** Explicit typed projection exposes only supported core identity/permission fields, ignoring unknown authorization flags.

36 frontend and three backend regressions added. See CENTRAL-AUTH-BUILD-11.md for evidence and limits. Live UI/product migration is not complete.

## CA-B13 — Shared product API cookie bridge

- [x] Default-off shared auth bridge with existing user/permission checks and mixed-credential rejection.
- [x] Optional-auth cookie failures cannot downgrade to anonymous; token-minting legacy profile excluded.
- [x] Fourteen new regressions; full backend 1,400 passed, 18 skipped.
- [ ] Remaining independent auth endpoints, frontend transport migration and live M1 acceptance.

## CA-B14 — Explicit cookie Axios transport

- [x] Cookie transport selectable through createAxiosInstance with destination/account/CSRF checks.
- [x] Legacy bearer path isolated; safe-read retry only; writes never automatically replayed.
- [x] Twenty new transport regressions; 565 full frontend tests before final adapter setting, focused rerun afterward.
- [ ] Main UI/provider and direct-request migration, actual browser acceptance and activation.

## CA-B15 — Session-aware shared hooks

- [x] Explicit session client through query/mutation/direct read helpers; no bearer headers in cookie mode.
- [x] Revision subscriptions, unique cache namespaces, disabled anonymous reads and mutation-state reset.
- [x] Eight new hook tests; 573 frontend tests, TypeScript and targeted lint pass.
- [ ] Main provider/screens selecting session mode and full live journey acceptance remain open.

## CA-B16 — Cookie hook cache, cancellation and callback isolation

- [x] **1. Endpoint/method cache collisions:** cookie query keys include the effective URL and HTTP method.
- [x] **2. Config-input cache collisions:** effective config params/body participate in cookie query identity.
- [x] **3. Unverified initial data:** cookie hooks ignore caller initialData as well as placeholderData.
- [x] **4. Abandoned query requests:** TanStack cancellation reaches Axios; caller cancellation is preserved and listeners are cleaned up.
- [x] **5. Mutation invalidation scope:** logical query prefixes are translated into the current client/revision namespace.
- [x] **6. Success callback composition:** custom success callbacks no longer replace required invalidation and configured success feedback in cookie mode.
- [x] **7. Stale mutation error callbacks:** old-owner errors cannot run hook-level error handlers after account change.
- [x] **8. Stale completion callbacks:** settled callbacks re-check ownership, including per-call callbacks when success changes the session.
- [x] **9. Mutation-key override:** caller options cannot replace the cookie mutation namespace or protected mutation function.
- [x] **10. Stale optimistic updates:** ownership is checked before onMutate runs, before any request dispatch.

Evidence: CENTRAL-AUTH-BUILD-16.md; 584 frontend tests, TypeScript and scoped lint passed. Main UI session activation and live M1 acceptance remain open.

## Closure pass — 25 October 2026

- [x] Staff pagination and keyboard/mobile step navigation repaired; semantic states and bounded page rendering tested.
- [x] Assessment listing failure/empty separation, authoring typography/focus and accurate permission/manual-AI copy.
- [x] Confirmed, account-bound submission receipt recovery and duplicate-submit guard; correct assessment cache invalidation.
- [x] Compact member access choices, scrolling/sticky footer and locked pending-save controls; failure recovery tested.
- [x] Stale interview-conflict callbacks and analytics profile/login-error privacy repaired.
- [x] Focused rendered navigation/member-dialog acceptance recorded; screenshot saved.
- [ ] Complete authenticated route matrix, remaining M1–M12 implementation/acceptance and release gates. Specific checks above do not close all D01–D25/O01–O13.


## Central-auth integration update — 26 October 2026

Student session wiring, continuation fixes and simulated concurrency evidence are recorded in `/Users/armasahar/Desktop/samvaad-saathi-revamp-2026-10-18/CENTRAL-AUTH-INTEGRATION-2026-10-26.md`. These implementation checks do not close central Home/staff migration, global revocation or live HTTPS acceptance. CodeGuru is deferred because no codebase exists.


## Role boundary hardening — 26 October 2026

- [x] Removed automatic credential-system fallback; fixed role-entry/public-route/unknown-role handling.
- [x] Closed deleted-account login/refresh and cached-role refresh gaps.
- [x] Separated access/refresh token purposes; unique IDs for new tokens.
- [x] Disabled shared API response caching and propagated cancellation.
- [x] Automated checks: 95 dashboard tests, 109 central-auth tests; type checks and scoped lint passed.

Full evidence and remaining gates: `/Users/armasahar/Desktop/samvaad-saathi-revamp-2026-10-18/ROLE-BOUNDARY-HARDENING-2026-10-26.md`. Full central-auth completion remains open.


## Home/staff session migration and revocation — 26 October 2026

- [x] Implemented opt-in Home/staff server sessions, cookie BFF, fresh role checks, CSRF and stale-tab account binding.
- [x] Added central revocation barriers, preserved authentication lineage, and confirmed logout flows.
- [x] Closed staff profile credential leakage; new BFF uses credential-free profile reads.
- [x] Automated evidence: 155 central tests (including local HTTPS and real Redis), 124 dashboard tests, 610 student tests; full Python run 1,414 passed plus final affected profile/session suites 60 passed.
- [ ] Coordinated configuration/build validation, browser HTTPS journey and live role/resource permission matrix remain open.
- [ ] Redis recovery policy, large ATS upload limits and Samvaad ambiguous-global-logout retry remain release gates.

Details: `/Users/armasahar/Desktop/samvaad-saathi-revamp-2026-10-18/HOME-STAFF-SESSION-MIGRATION-2026-10-26.md`. Browser access remains disabled; production unchanged.


## Requested items 1–7: isolated HTTPS follow-up — 26 October 2026

- [x] Global logout response-loss recovery, including already-revoked lineage acknowledgement and product receipt.
- [x] Isolated HTTPS origins and both frontend production builds.
- [x] Live four-role protocol tests, scoped permission revocation/version checks and 108/108 concurrent requests.
- [x] Redis AOF/noeviction restart test and provisioned security-state marker with fail-closed test.
- [x] Single-use ATS resume upload grants, direct CORS and bounded large-upload validation.
- [x] Home-to-Samvaad real PKCE/cookie handoff and replay rejection.
- [ ] Rendered browser acceptance: latest tool reports local browser access disabled; certificate trust not observed.
- [ ] Expanded program/placement/mentor/custom/mixed-role UI acceptance and hosted ingress/recovery validation.

Evidence and limitations: `HTTPS-SESSION-ACCEPTANCE-2026-10-26.md` in the redesign documentation directory. This entry supersedes the earlier blanket statement that all local configuration/upload/recovery checks were still pending. Production deployment remains excluded.
