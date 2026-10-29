# Batch 22 — staff authoring and team modal repair

24 October 2026. Local candidate only; no deployment or production mutation.

## Changes

- Add/Edit Question use the shared Radix dialog: named title/description, focus containment, Escape, return to the invoking control and bounded viewport scrolling. Fields have associated labels, narrow layouts stack, and the current category remains represented even if absent from the fetched bank.
- Add/Save reject blank prompts, share a synchronous submission lock, disable editing/dismissal during the request, retain drafts after failure and explicitly reject published-profile writes. The dialog closes if publication is observed; backend publication checks remain authoritative. This is a local duplicate-click guard, not durable request idempotency across reloads.
- Question expand/search/clear controls have names, expansion state and larger targets. Question card keyboard focus is visible; long prompt text can wrap. Specific authoring metadata/review labels use larger text and darker colors.
- Team recycle bin and delete confirmation use named shared dialogs with focus return and bounded scrolling. Shared close controls have a minimum 44px target.
- Delete Team has an immediate duplicate-submission guard, rejects non-super-admin invocations locally, prevents edits/dismissal while saving, and retains confirmation on failure. Server permissions remain authoritative.
- Recycle-bin load failures are no longer presented as empty results. A visible error and refresh action replace misleading emptiness; older overlapping requests cannot replace a newer result. Legacy fallback occurs only for 404/405, never auth errors, rate limiting or server failures. Malformed responses are errors.

## Three checks of this change set

1. Source/control-flow audit: inspected authoring handlers, published-state fieldset, both question dialogs, question actions and team overlays. Found the portal/fieldset boundary and duplicate submission risks; added explicit guards.
2. Behavioral regressions: 6 new DOM-simulator tests pass for named/labelled dialogs, category preservation, blank/pending states, Escape and invoking-control focus return. 8 new service tests pass for recycle-bin fallback, auth/server error propagation, malformed payloads and true empty results.
3. Final integration/static review: all 45 dashboard Node tests and all 434 student unit/component tests pass. Both TypeScript checks and repository diff whitespace checks pass. Reviewed new error/pending branches and reran the focused dialog suite after the final edits.

These are three checks of **this change set**, not three completed end-to-end passes over the platform. Team page focus behavior, long names, nested purge dialog interactions, zoom, phone keyboard and rendered contrast still require actual browser acceptance.

Commands:
- Dashboard: `node --test tests/*.test.mjs`; `./node_modules/.bin/tsc --noEmit`
- Student: `./node_modules/.bin/vitest run`; `./node_modules/.bin/tsc --noEmit`
- Cross-product component checks from student checkout: `./node_modules/.bin/vitest run --config vitest.staff.config.mjs`. Requires sibling `sampark-saathi frontend` checkout and both installed dependency trees. Uses the dashboard React runtime; does not launch or automate a browser.

Logs for this local run: `/tmp/samvaad-b22-staff-tests.log`, `/tmp/samvaad-b22-dialog-tests.log`, `/tmp/samvaad-b22-student-tests.log`, `/tmp/samvaad-b22-staff-types.log`, `/tmp/samvaad-b22-student-types.log`.

## Acceptance blockers and remaining work

The user authorized local browser testing on 24 October. The computer-use tool nevertheless returned “Local browser use is disabled in Work settings.” Requested the actual setting change; no browser bypass attempted. Physical mobile and native VoiceOver remain pending by prior agreement.

The wider tracker remains open: durable legacy drill creation/audio recovery, broader privacy and callback audit, integrated role/reviewer/media/provider acceptance, graduation implementation, real reviewed Jev data and verified historical mappings. None is closed by this UI batch. No production readiness claim.
