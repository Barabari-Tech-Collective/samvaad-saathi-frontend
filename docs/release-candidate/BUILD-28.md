# Build 28 — assessment observation lifecycle and accessible preflight

Implemented 20 October 2026 in the student release candidate. Production remains unchanged.

## Finding and delivered lifecycle

Assessment monitoring previously retained active/preflight state, an unsent event and in-flight flags across sitting or account changes. Late report responses could update a newer context. A delayed fullscreen request could activate after cancellation. The interruption copy also asserted that a session was still active without a fresh server status check.

Monitoring now has an explicit in-memory owner for the enabled state, valid positive safe-integer sitting ID and account scope. Changing any of these or unmounting clears its active state, notices, fullscreen engagement history, cooldown and unsent event. It requires a fresh begin after re-enabling. Invalid IDs and empty account scope cannot activate it. The actual interview page supplies authenticated identity scope and disables observation when identity is unavailable or its timer has expired.

Pending report completion can update only its original live owner. An old response cannot mark a new account's event saved or release that new request's in-flight guard. Same-context manual/online retries retain the original event ID and use the current reporter; concurrent retry calls cannot duplicate an in-flight request. Existing burst throttling and one-pending-event behavior remain in place.

Fullscreen begin now returns an explicit accepted/cancelled result. Pending begin calls cannot launch another concurrent request. Cancellation and later begin attempts use monotonic tickets so an earlier browser promise cannot accept the later attempt. Sitting/account changes and unmount invalidate pending acceptance. Unsupported or rejected fullscreen still permits an explicitly accepted assessment and does not create a misconduct event. The interview caller only activates the prepared sitting after accepted begin, and exposes start failure through its recovery message rather than an unhandled rejection.

Interruption copy no longer independently claims the session is active. It explains that the signal does not automatically end the sitting and asks the student to check the current timer/question. The browser observer does not stop the timer, delete answers, classify cheating or invoke termination.

## Preflight keyboard and visual behavior

The preflight uses a native modal dialog with labelled title/policy, enabled-action focus cycling, Escape cancellation and focus restoration to a connected opener. Its pending begin button is disabled with an Opening assessment label; cancellation remains available while the browser request is pending. Buttons have at least 44px height, visible keyboard focus and responsive wrapping. Manual retry/continue actions in the interruption notice also have 44px minimum height.

## Focused accessibility review

Used the design:accessibility-review skill for this dialog, not a full-platform WCAG certification.

| Finding                                                   | Criterion / concern                            | Result                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Prior open dialog did not establish native modal behavior | Keyboard access and focus order (2.1.1, 2.4.3) | Native modal, enabled-action wrap, Escape and opener focus recovery verified in Chromium |
| Preflight/retry targets could be smaller than intended    | 44px target guidance                           | Dialog action height checked; notice actions given minimum height                        |
| Interruption text implied an unverified active state      | Predictable status and instructions            | Changed to cautious timer/question guidance                                              |

White-background contrast calculations: navy #1F285B 13.88:1, blue #344499 8.63:1 and black/white 21:1. These exceed 4.5:1 for those tested foreground/background pairs; this is not an audit of every application token. Dialog names/descriptions are present. Real VoiceOver/NVDA announcements remain untested.

## Verification

232 student unit tests passed, including 13 new ownership/cancellation cases. The final full Chromium suite passed 90 browser cases, including six new assessment-observation cases. TypeScript, full lint/format checks, webpack production build and diff checks passed.

New unit cases cover invalid IDs, empty account scope, pending-event removal on sitting changes, late response/new-account request overlap, disable/re-enable, cancel/reopen ticket ordering, unmount during fullscreen, updated same-context reporter and unsupported fullscreen. Existing non-punitive observation cases remain included.

Browser cases verify dialog focus, Escape/opener restoration, geometry and action size at 1280x900, 320x740 and 740x320; retry of the identical event without stopping the fixture session; account-change removal of old events; and cancelled delayed fullscreen. A 320px screenshot was inspected. These execute the actual hook/modal in a dedicated synthetic fixture with mocked APIs/fullscreen outcomes, not the entire authenticated interview page or physical browser/device permission UI. The production page wiring is type/build checked; complete formal-session acceptance remains open.

## Limits and next work

An already accepted report request may finish on the server after navigation; this guard prevents stale client effects and does not erase server evidence. The browser fullscreen API is global and its pending promise cannot be cancelled by this code; late browser fullscreen entry may still occur, but cannot activate an invalidated hook owner. Native browser exit controls remain available.

Unsent events are deliberately memory-only and are discarded on context departure. One pending event and a cooldown are not an exhaustive or durable integrity journal. Browser signals cannot prove cheating or exclude an unseen second device. No calibration, integrity scoring, review verdict, new technical hold or zero-cheating guarantee is added.

ACTION-CONTEXT-01 remains open: audit the broader active interview page's audio, preparation, navigation and completion callbacks for identity/sitting changes. This batch scopes observation ownership; it does not claim to isolate every other hook in that page. Coordinated authenticated Sampark, actual device/provider/screen-reader/load and rollout acceptance remain required. No backend, dashboard, central, schema, role-grant, AWS or production change; unchanged suites were not rerun. The preexisting ops/**pycache** files remain untouched.

AWS relocation stays deferred. Seven historical staff course assignments still require approved mappings. Companion/media/Jev retain their separate plans. Build 28 is the twelfth batch against the post-Build-16 estimate in REMAINING-DELIVERY.md; this is not a pilot-completion claim or a reset of the estimate.
