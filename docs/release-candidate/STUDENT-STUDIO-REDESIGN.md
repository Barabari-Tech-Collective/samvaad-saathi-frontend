> **22 October follow-up:** see [production failure and device audit](production-audit/README.md) for the latest hardening fixes, 85 acceptance cases and 342-test student verification. Earlier 296-test evidence below records the redesign checkpoint. Latest visual/device/native acceptance remains pending.

# Student Interview Studio redesign

Date: 2026-10-22. Candidate implementation for local review; not deployed.

## Intent and approach

The student product should answer three immediate questions: what can I do now, where is my saved work, and what should I practise next? The new hierarchy uses a navy practice focus area, compact direct-entry skills, a journal-like history and quieter supporting tasks. The visible product keeps the Barabari brand, Inter/Poppins/Noto Sans Devanagari and the expandable icon navigation.

The redesign is implemented in the existing Next.js app. It preserves the backend contracts and current assessment, voice, recovery and access behavior. It introduces no provider calls, fabricated progress or production-data migration.

## Skill/tool provenance

The requested `figma:figma-create-design-system-rules` skill was read and its repository audit/template applied to AGENTS.md. The Figma connector was connected and verified, but its exposed tools do not include the skill's `create_design_system_rules` command. No Figma node/file was supplied, so this is a code-authored design system, not a claim of verified 1:1 Figma implementation.

A generated desktop visual reference was inspected in Stitch (project 7467702815025853689, screen 9098fc056b0942c4a26e8c5012c7c30c). Its composition informed the practice focus area and compact task layout. Its invented calendar-sync, mic-ready, cohort, endorsement and fixed-duration claims were rejected; its alternate font was not adopted. The reference is not a screenshot of the application.

The requested `design:design-critique` skill was then applied to that reference and the implemented component/interaction structure, followed by the second pass recorded below. This was a structured self-review, not an independent usability study or browser visual sign-off.

## Implemented screen coverage

| Area | Change |
| --- | --- |
| Shell and navigation | Shared canvas, tighter icon/label rhythm, navy current selection, separate brand/collapse/Back placement, preserved expanded/collapsed preference and mobile drawer/bottom navigation |
| Home | Personal studio heading, navy practice focus panel with quiet static voice ornament, compact skills and supporting tasks, truthful recent-work states |
| Practice | Shared page hierarchy and panels, direct skill entries, preserved saved-session readiness/expiry and coaching evidence rules |
| Skill entry | Structure and pacing now show task setup next to concise guidance; pronunciation gets the same layout, labelled role select and announced difficulty selection |
| Secondary states | Recording/loading gradients removed from structure and pronunciation; interview error recovery links to History; code supplement width constrained to its column |
| Skill sessions | Guided warm-up/think-fast headers, pacing levels/intro/recording/report, pronunciation recording and structure question overview use the shared hierarchy and room surfaces |
| Interview setup | Explicit choose/check/begin sequence, consistent form surface, retained practice/formal separation and publication constraints |
| Live interview | Compact mode/role/time header, clearer question position and typography, recording panel and wrapping action row, simplified welcome with existing instructions and gates |
| Submission and feedback | Shared submission panel, navy report header, lighter section surfaces; verified receipt and feedback-availability states retained |
| History | Interview journal heading with the existing mode/status filters, saved work and feedback destinations |
| Resume | Shared five-stage progress, appropriate parent Back destinations, removal of duplicate icon Back controls and repeated AI badges, common form surface; illustrative template artwork labelled honestly |
| Profile | Horizontal identity block, coherent settings surface, unavailable attempt count does not become a fictional zero |
| Human interviews | Shared heading/action hierarchy and appointment empty surface; existing Google Meet checks and fresh access verification retained |
| Assessment reviews | Clear review/appeal heading and supporting explanation; evidence, deadlines, version checks and privacy behavior retained |
| Sign-in | Responsive studio introduction and focused SSO action; preserved full navigation redirect, access-request and processing states; removed nested button/link |
| Onboarding | Clear education/career steps, associated form labels, retained values when going Back, guarded duplicate submission and navigation while saving |
| Permissioned bulk ATS | Header/brand rhythm aligned; existing capability notices and gated workflow retained |

## Design critique and iteration

### Overall impression

The practice focus area provides a useful first visual anchor, and skills have direct destinations. The initial implementation still had too many disconnected setup patterns and some navigation affordances that did not match their behavior. The second pass addresses those issues below.

| Finding | Severity | Applied change |
| --- | --- | --- |
| Structure setup had a disabled button inside a working link | High | Single native action remains disabled until a role is selected; tests verify no navigation before selection |
| Selection was only expressed by color | Moderate | Role/difficulty choices expose `aria-pressed`; selected styling uses a border/inset marker as well |
| Resume pages duplicated Back and repeatedly promoted AI | Moderate | One shell Back destination per step, shared progress and removal of redundant badge/header blocks |
| Tablet content could be cramped beside an expanded sidebar | Moderate | Home/skill entry stack at 768–1023px; Home skills remain single-column through 1199px |
| Supporting art could precede the user's task on phones | Moderate | Skill setup is first in source order; mobile sign-in places the form before the supporting story; decorative wave hidden in narrow supporting panels |
| Long recording labels could push actions outside the viewport | Moderate | Action groups wrap and use available width; room header stacks on phones |
| Original input outline lacked sufficient non-text contrast | Moderate | Strong border token changed to #7C899F, 3.54:1 against white and 3.35:1 against the canvas |
| Refreshed resume pages could show fallback results without an analysis | High | A review workspace gate explains the lost in-memory analysis and routes to upload; four regression cases cover missing/present analysis |
| Empty/all-locked pacing catalogue could dereference a missing level or offer a locked one | High | Honest no-level state; no Start link until an unlocked level exists; fetch errors include Retry |
| Onboarding lacked a safe Back path and associated labels | Moderate | Preserved mounted step state, explicit Back action, labelled controls and an in-flight guard covering extraction/polling/profile save |
| Template illustration implied external endorsement | Moderate | Removed “Recruiter Approved”; labelled the paper as an illustrative layout |
| English UI had Hindi as its document language | Moderate | Root language changed to English; Devanagari font fallback preserved |
| Repeated oversized headings/illustrations weakened hierarchy | Moderate | Shared page heading, smaller recording timer, compact skill setup and clearer task-first reading order |

### Hierarchy and consistency

Home reads greeting → practice action → short skills → recent work. A saved-session state can replace the normal start action without changing its prominence. Setup reads title → short sequence → form → Continue. In the room, mode/time stay separate from the question and recording controls. Secondary pages reuse the same heading, panel and action rhythm.

The reference's repeated mock labels and unavailable calendar functionality were deliberately excluded. Empty states use verified query results; a loading/error state is not treated as “no appointments” or “zero progress.”

### Accessibility checks

Calculated sRGB contrast for token pairs (not a rendered-page audit):

| Pair | Ratio |
| --- | ---: |
| Primary ink / white | 15.91:1 |
| Muted text / white | 5.97:1 |
| Muted text / canvas | 5.65:1 |
| White / navy | 13.88:1 |
| Yellow / navy | 9.21:1 |
| Secondary light text / navy | 10.40:1 |
| Input border / white | 3.54:1 |
| Input border / canvas | 3.35:1 |

Studio actions use 46–52px targets; the existing shell retains 44px minima, named icons, focus states, skip link and native mobile dialog. This is not a claim that every inherited color pair, physical touch target or screen-reader announcement has passed rendered acceptance.

## Verification

- 296 tests passed across 23 Vitest files, including 15 new interaction regressions for role selection, disabled navigation, empty/locked pacing catalogues, retry, resume navigation/progress, missing resume analysis and onboarding state/save guards.
- TypeScript check passed; optimized Next.js webpack build passed, with all 35 generated static outputs completing.
- Release lint: zero errors; one existing `useQuestionAttempt.ts` effect-cleanup ref warning remains. Additional lint on studio components, auth, onboarding and the new skill entry pages passed.
- Formatting applied to touched files; `git diff --check` passed.
- Local HTTP: the new sign-in title and studio stylesheet/token selectors were verified in the served HTML/CSS; sign-in serves HTTP 200; sampled protected routes redirect to sign-in without credentials, as expected. This checks serving/auth boundaries, not authenticated UI interaction.
- Existing formal-session, report/receipt, practice-resume, provider lifecycle and navigation regression suites still pass. No live AI/speech request was required for this presentation work.

## Manual review route

Open http://localhost:3000/home with the existing isolated local student account. Review:

1. Home at narrow, tablet and desktop widths; expand/collapse navigation and use More on a narrow viewport.
2. Practice → each skill → choose a level/role → record/replay/retry → feedback.
3. Practice interview → setup → device checks → welcome → answer → pause/reconnect → submission → feedback/history.
4. Assessment setup and review/appeal pages, especially unavailable/revoked access and long text.
5. Resume upload → review → skills → polish → template/export; Back at each step.
6. Profile field editing, voice preferences and consent; human-interview appointment join states.
7. Sign-in and onboarding at small widths, keyboard-only interaction, 200% zoom and long labels.

Browser automation remains disabled at the user's request. Authenticated browser visual acceptance, physical-mobile testing and native VoiceOver remain pending; the user previously chose to review the local UI manually. The prior 34-view prototype is not an acceptance artifact for this redesign. Production deployment remains a separate release decision after local review.
