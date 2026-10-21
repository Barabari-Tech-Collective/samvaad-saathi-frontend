# Build 21 — first-use guidance without task interruption

Implemented 20 October 2026; student and dashboard release candidates only. Production remains unchanged.

## Behavior and responsive pattern

First-use help now offers a nonmodal invitation after the existing delay. It never opens a dialog or moves focus automatically. Start guide explicitly opens the modal; Not now dismisses the invitation and keeps Quick guide available. Completion, Skip and Escape preserve replay. Preference keys remain scoped to account, workspace, role and version, preserving previous dismissals rather than forcing existing users through a new guide.

The compact white card uses navy text, blue accents, the brand yellow top edge, black primary actions and inherited application fonts. It has 44px minimum actions, safe-area offsets, wrapping content and viewport-bounded scrolling. It supports 320px portrait, desktop and short landscape layouts. It remains a floating help pattern; this batch does not claim to complete the broader visual redesign.

The modal focuses its heading when launched or when the step changes. Keyboard navigation stays inside it; Escape dismisses and focus returns to the initiating control or replay trigger. A guide does not stack above another task modal. Missing, hidden, non-HTML or malformed anchor selectors leave a readable card; they do not block progress. Highlight cleanup follows step/session removal.

Account, permitted content or route changes remount the guide session and remove the obsolete modal. Student help remains restricted to home/practice/history/profile, outside recording, onboarding and assessment/device-check routes. Staff help is now limited to explicit landing pages, excluding editors and detail workflows. Course workspace and authoring steps require current feature access as well as the existing role capability. Loading/error access states do not offer staff guidance. This is explanatory UI, never an authorization grant.

## Persistence and failure behavior

Malformed preference JSON is treated as unseen. Blocked storage still allows launch, skip, completion and replay, with a same-page memory fallback. Dismissal/completion is synchronized across same-origin tabs and mounted guides for the matching preference key; an already user-launched guide in another tab is not forcibly closed. Stored preferences contain only outcome/time. They are browser-local, not cross-device or server-persisted. A storage-blocked browser can receive the invitation again after a full reload.

## Verification

- Student: 109 Vitest tests passed, including ten guide cases; TypeScript, release lint and webpack production build passed. Release lint retains three existing unused-icon warnings.
- Dashboard: 37 Node tests, TypeScript, targeted Biome checks and production build passed. The existing fixture root non-null assertion remains a lint warning.
- Browser: full suites passed with nine student and nineteen dashboard cases before the last cross-tab regression was added. Final guide suites passed six student and ten dashboard cases, including the added cross-tab check. Across these runs, ten distinct student and twenty distinct dashboard scenarios were verified; overlapping guide cases are not added twice.
- Browser cases include portrait/desktop/short landscape, working focus, heading focus, keyboard containment, Escape/replay, blocked storage/reduced motion, account/content removal, actual staff feature revocation and error/editor exclusion.
- 320px invitation/dialog screenshots were visually inspected from the local fixture. The fixture is not an authenticated production page or evidence of device-wide acceptance.
- Diff checks passed in both repositories. Backend and central service are unchanged; their suites were not rerun. No migration or production/provider/cloud change occurred.

## Remaining acceptance and next build

Authenticated navigation with real identities, all supported browser/device combinations, screen-reader testing, accepted full screen designs and representative load remain open. Guide persistence is local by design; server/cross-device preferences are separate work. Permission enforcement remains in the APIs. The next responsive batch should cover student practice entry, saved progress/recovery and key staff course workflows, rather than treating this help pattern as full UI acceptance.

Build 21 is the fifth batch against the post-Build-16 estimate in REMAINING-DELIVERY.md. AWS relocation remains deferred.
