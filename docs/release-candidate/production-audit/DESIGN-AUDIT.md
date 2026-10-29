> **24 October update:** Local browser testing is now authorized by the user, but the tool still reports it disabled in Work settings. Batch 22 repairs authoring/team dialogs and recycle-bin error states; rendered acceptance is still pending. Earlier restriction notes below describe the original audit.

> **Batch 01 update, 22 October:** O01/D01 screenshot-based profile save is now replaced by the backend PDF source, with duplicate-action guards and nine new tests. Document/font/authenticated acceptance remains pending. Use [FIX-TRACKER.md](FIX-TRACKER.md) for current status; original findings below are retained as audit evidence.

# Device, accessibility and brand audit

## Evidence boundary

This is a source-informed design critique of the latest local implementation plus an acceptance plan. No rendered screenshots, actual touch measurements, browser zoom runs or native screen-reader sessions were performed in this pass. The user kept browser access disabled, has no physical mobile device and previously left VoiceOver pending. Therefore “source risk” means a specific implementation deserves checking, not that a screenshot defect has been measured.

The previous generic prototype is not evidence of the current implemented UI. The most damaging brand failures are a task that lies about its capability, a broken save, unreadable important feedback, an unexplained dead end and inconsistent recovery. Decorative polish is secondary to these.

## Concrete findings to fix or inspect

| ID / severity | Surface / source | Brand or UX impact | Disposition / acceptance requirement |
|---|---|---|---|
| D01 / P1 | Résumé final profile save: screenshot PDF; `ai-resume/final/page.tsx` | Product calls it ATS résumé, but screenshot output may not be text-readable and long output may clip | OPEN O01; text/pagination acceptance required, not a font tweak |
| D02 / P2 | Pronunciation setup copy and backend difficulty-only generation | Choosing a role appears meaningful but has no effect; promised feedback was absent | FIXED copy/control; observe students understand listen-and-repeat scope |
| D03 / P2 | Pronunciation arbitrary welcome hold/final Next label | Delays useful content and obscures whether the task is finishing | FIXED; words open immediately; final Finish practice action |
| D04 / P1 accessibility | Microphone permission overlay; résumé link guidelines | Keyboard/reader users could encounter unnamed or non-modal controls | FIXED native named modal and controls; actual focus, Escape and return remain pending |
| D05 / P2 | `dashboard/.../tag-badge.tsx`, studio eyebrow, résumé Note | Tiny text/affordance weakens readability and looks inconsistent | FIXED specific components; verify rendered contrast/wrapping at 200% text |
| D06 / P2 | Staff student-table skeleton outside table viewport | Loading-state width can damage the layout before data arrives | FIXED hard minimum; verify no layout shift on resolution |
| D07 / P2 | Structured drill report/loader fixed 80vh and nested min-h-screen | Empty phone screens, unnecessary scroll, potential constrained content | FIXED growable layout; verify short landscape and long error text |
| D08 / P2 | `ai-resume/final/page.tsx` 10–11px document preview typography | Phone readability is weak if preview has no fit/zoom control; print typography is a separate requirement | OPEN design review; do not blanket-enlarge PDF styling and accidentally change pagination |
| D09 / P2 | `ai-resume/preview/page.tsx` 9px Layout example badge, input-form 10px label | Decorative miniature text may be unreadable, and illustration can be mistaken for generated document | OPEN; keep illustrative label explicit outside preview, make meaningful text readable |
| D10 / P2 | Multiple staff Roles/Teams/MemberModal labels/errors use 10–11px and pale gray | Dense permissions and error text become hard to read; granting rights is high-consequence | OPEN targeted typography/contrast review; permission labels and denial/errors take priority over chart ticks |
| D11 / P1 usability | Large bulk ATS table (`min-w-[1120px]`) and interview tables (`min-w-[1000px]`) | Phone users may lose row identity/action while scrolling | Source already uses named keyboard-focusable table viewport; **not automatically a WCAG failure**. Verify sticky identity/action, visible scroll affordance and a task-focused narrow alternative |
| D12 / P1 | All dialogs under phone keyboard and short landscape | Submit/Cancel can be hidden below viewport; auto scroll may lose error context | PENDING actual viewport/keyboard testing; content scrolls, header/actions remain reachable, no background interaction |
| D13 / P2 | Brand + menu + Back + profile + expanded/collapsed nav | Competing controls can crowd narrow header or make previous-step route unclear | Existing shell separates task Back and nav toggle; visual check at 320/360 and every breakpoint, with long title/font fallback |
| D14 / P2 | Mobile More hides secondary tasks | Student may not discover résumé, review, human interview or profile | Keep core 3 tasks stable; test findability, active More state, labels and route focus without coaching |
| D15 / P1 | Errors during capture/convert/save | Console-only failures look like unresponsive UI and undermine trust in saved work | New targeted errors/statuses in drills and storage flows; audit remaining ad hoc catch blocks before calling all flows fixed |
| D16 / P2 | Recording playback and companion animation | Duplicate speech or decorative motion competing with prompt disrupts concentration | Targeted replay cleanup; test mute/hide/reduced motion and no late voice after leaving |
| D17 / P2 | Empty state versus request failure versus access denied | Empty dashboard or 0 score can incorrectly imply poor performance | Verify separate states and next action in every route; no invented score, streak or ranking |
| D18 / P1 | Permission revoke or stale publication while editing | Sudden disappearance or misleading save success damages trust more than layout | Show stable denial/conflict with preserved permitted draft; API remains authority |
| D19 / P2 | English/Hindi, long course/person/role names and URLs | Clipped matras, harsh wrapping, ellipsis-only titles and broken row alignment | Use Noto Sans Devanagari fallback, adequate line height and full-label access; rendered inspection pending |
| D20 / P1 | Sticky headers/bottom navigation/guide popover | Actions can be covered at zoom, by keyboard or safe areas | Matrix must verify footer clearance and no overlapping coachmarks; presence of safe-area CSS is not proof |
| D21 / P2 | Too many large empty panels and headings above primary task | Appears templated; learner scrolls through decoration before doing work | Task-first small-screen ordering already implemented; observe task completion and use real data/no-data cases |
| D22 / P2 | Status chips, scores and chart colors | Meaning may be lost for color-blind users; yellow-on-white is not a safe body-text default | Text/icon labels, table alternatives and measured computed styles; no color-only meaning |
| D23 / P1 | Browser-level validation, selected controls, route titles and live status | Visual state may not be announced to assistive technology | Legend/pressed/current state improvements; all actual announcements need native-reader acceptance |
| D24 / P2 | Hover-only hints, icon actions and tiny pagination | Touch users cannot hover; keyboard users may not receive explanation | Tooltips supplementary only, persistent labels for critical actions, names for icons, sufficient touch targets |
| D25 / P2 | New student design versus inherited central/staff routes | Abrupt font/spacing/status vocabulary changes make product feel assembled from unrelated apps | 86-route inventory covers these surfaces; shared semantic tokens/components should migrate by task, not global override guesses |

## Device and interaction matrix

Run every route from route-inventory.csv. Prioritize all P0/P1 user journeys before decorative screens. For each viewport inspect loading, empty, normal, long content, error, forbidden, stale, submitting and success states. Record browser/version, build identifier, role/data fixture, screenshot, action and actual result.

| Profile | Sizes / conditions | Must inspect |
|---|---|---|
| Small phone | 320×568, 360×640 | Header/logo, one clear primary action, narrow cards, bottom nav, long labels, no body horizontal scroll |
| Common phone | 390×844, 430×932 | Reachable Start/Stop/Retry, dialog/body scrolling, upload filenames, status and progress |
| Phone landscape | 844×390, 667×375 | Permission/dialog actions, question visible above controls, safe areas and minimal fixed-height waste |
| Tablet | 768×1024, 820×1180, 1024×768 | Sidebar versus main width; portrait/landscape transition; table/chart alternatives; touch-friendly menus |
| Laptop | 1280×720, 1440×900 | Short-height actions, dense permission tables, readable text width, expanded/collapsed navigation |
| Wide desktop | 1920×1080 | Bounded reading width; useful density without stretched lines or detached controls |
| Reflow/zoom | 1280px at 400%; 200% zoom; 200% text separately | Equivalent narrow viewport without lost content/functionality; contained two-dimensional tables |
| Font/content stress | Browser font fallback, Hindi/mixed names, 200-character labels, 2,000-character feedback, empty and large counts | No clipped glyphs, overflow, misleading truncation or layout movement that relocates an action |
| Assistive input | Keyboard only, native VoiceOver later, reduced motion, forced colors | Focus/order/modal behavior; labels/headings/announcements; visible selected/error states |
| Physical mobile later | Safari iPhone/iPad; Android Chrome; keyboard, permission, call, lock, rotate | Real recording codec, suspension/reconnect, touch accuracy and keyboard occlusion |

All rows are **pending rendered/physical acceptance** for this latest candidate. Device emulation alone, when eventually permitted, must not be recorded as physical testing.

## Fine-detail review checklist

- Brand: one logo lockup; correct aspect ratio; no pixelated/stretching assets; consistent Samvaad Saathi spelling; no duplicate brand/menu/back stack; font roles consistent.
- Navigation: actual links versus actions, active destination, collapsed accessible name, expanded text, meaningful Back destination, keyboard route focus, signed-out/revoked route recovery.
- Hierarchy: task title versus marketing copy, primary versus secondary/destructive action, one dominant next action, no low-value cards ahead of the task.
- Spacing: align content and control edges, consistent panel padding, no accidental nested full-screen gap, use available tablet width, short-height screens can scroll.
- Typography: meaningful text readable; no essential 9–11px labels/errors; mixed-script line height, no justified paragraphs creating rivers, full long label accessible.
- Controls: clear focus/hover/pressed/disabled/busy states, no underline-only button ambiguity, no nested interactive elements, label and error association, fieldset/legend for grouped choices.
- Async: announce important status once, retain values on error, disable duplicate writes synchronously, avoid spinner-only dead ends, retry does not recreate accepted work.
- Media: visual state reflects actual stream/audio, no fake progress, no background playback, permission denial visible, camera/mic stopped on leave, readiness conditions explicit.
- Tables: caption/headers, keyboard-accessible scroll, stable row identity, understandable sorting/pagination/filter state, empty versus failed rows, no clipped menus at scroll-container edges.
- Dialogs: meaningful accessible name, initial focus, Tab containment, Escape, focus restoration, scrolling long content, visible close label, 44px project touch goal, no stacked conflicting overlays.
- Feedback: completion receipt versus pending analysis, unavailable versus zero, no contradictory score denominator, readable long feedback and recommendation order, assess evidence before showing a claim.
- Documents: text-preserving output, multi-page layout, export typography independent of screen size, filenames and unsupported formats, no active HTML from uploaded/provider text.
- Mobile: safe areas, sticky UI spacing, keyboard-open save action, touch precision, no hover-only instructions, rotation and suspended-tab behavior.
- Accessibility: skip link, main landmark, heading outline, current/pressed/expanded state, error summary/focus, live-region restraint, no color-only state, focus not clipped.

## Accessibility references

- Reflow at an equivalent 320 CSS-pixel width, with exceptions for content genuinely requiring two-dimensional layout: [W3C SC 1.4.10](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html).
- Normal text contrast at least 4.5:1 and qualifying large text 3:1: [W3C SC 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html). Token contrast calculations do not cover all rendered inherited colors.
- We use 44×44 CSS px as a project touch-target goal. In WCAG 2.1 this is Level AAA SC 2.5.5, **not** a blanket Level AA requirement: [W3C target size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html).
- Modal focus containment, Escape and return behavior require an actual keyboard check: [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
