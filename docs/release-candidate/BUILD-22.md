# Build 22 — responsive practice entry and verified saved progress

Implemented 20 October 2026; student release candidate only. Production remains unchanged.

## Product flow

The practice page now prioritizes one next step, with shortcuts to skill builders and saved sessions/feedback. Verified saved interviews show the server-reported saved-answer count and an explicit practice-only resume link. Zero-question preparation has a reopen message instead of a misleading 0-of-0 progress statement. A verified new-student zero state remains distinct from missing data.

The main plan uses a white surface, navy typography, blue borders, a black CTA and a quiet focus surface. The existing font system is inherited. Content wraps across 320px portrait, short landscape and desktop, including long unbroken track names. Coaching follow-ups appear after the primary plan; an empty follow-up list no longer shows disabled pagination controls. Nonempty/multiple pages retain navigation. Primary actions have touch-sized height and vertical padding. Loading/hover motion honors reduced-motion preferences.

## Truthful state and recovery

The page waits for authenticated identity and scopes hub queries, mounted presentation state and coaching query keys to the account. An account change removes the previous account's progress while the new plan loads. Hub queries have no retained inactive cache, revalidate on focus, and do not automatically retry indefinitely.

Loading and refresh explicitly say that saved progress is being checked. Cached resume links, activity totals, recommendations and progress bars are hidden while refreshing or after a failed request, including a refused-access response. A failed or malformed plan does not become zero activity or a fabricated focus. It offers retry, History and independent skill builders; the primary recovery action goes to History rather than encouraging an unchecked second mock. This does not bypass module or interview permissions.

Runtime validation checks required fields, nonnegative safe-integer counts, allowed resume states, valid IDs, possible saved/total counts, parseable expiry and supported focus module/path pairs. A malformed focus module object cannot throw during validation. Unsupported external or script destinations are rejected. Evidence progress remains bounded and handles nonfinite helper inputs safely.

A saved-session expiry is checked as the page remains open. Once detected, the continue action is replaced with a resume-window notice and the normal new-practice action; History stays available. This is client presentation only: the server remains authoritative for expiry, enrollment and session ownership, including clock skew and background timer delays. No answer is deleted by this component.

## Verification

Final checks are recorded in verification/revision-22-checks.json in the local blueprint. **137 student unit tests** and **17 browser cases** passed in the final runs. TypeScript, release lint and the webpack production build passed; release lint retains three existing unused-icon warnings. Diff checks passed. The no-focus state also distinguishes insufficient evidence from enough evidence without a clear recommendation. Browser tests mount the actual Practice page with its query client and synthetic identity/API responses; they do not substitute a separate mock presentation. They cover retained-answer recovery regressions, cached-refresh denial/retry, account changes, expiry, verified-zero/malformed states and portrait/desktop/short-landscape layout. Track/identity/API data are fixture data, not authenticated production acceptance.

Desktop and 320px screenshots are visually reviewed. Backend, dashboard and central services are unchanged; their suites are not rerun. No schema migration, cloud/provider/role setting or production activation occurred.

## Open contracts and next work

HUB-COUNT-01: the backend hub currently counts saved attempt rows. Older repeated attempts can make its aggregate exceed the number of current questions. This UI rejects impossible totals and offers History, but does not repair or guess that history. Review current-question counting and fixed-plan/legacy compatibility in the next backend contract batch.

HUB-ACCESS-01: the current hub payload has no per-session course-access readiness field. A successful hub response is not proof that enrollment still permits the selected session. Individual course participation, ownership, lease takeover and expiry remain checked by the existing resume/answer APIs. The refused-hub browser test covers a denied hub request, not every real enrollment-revocation path.

Authenticated shell navigation, actual central identities/enrollment updates, supported devices, screen readers, provider faults and measured load remain acceptance gates. This batch is practice entry, not completion of all history/report or staff screens. Preferences and the companion roadmap from earlier builds are unchanged. AWS relocation remains deferred.

Build 22 is the sixth batch against the post-Build-16 estimate in REMAINING-DELIVERY.md; it does not reset that estimate.
