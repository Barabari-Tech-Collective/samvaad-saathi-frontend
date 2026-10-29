# Local student session failure — 28 October 2026

The repeated session error was reproduced in the user's in-app browser. Earlier HTTP-only handoff checks did not exercise the browser session client and were insufficient to claim this fixed.

- [x] Fix native `fetch` invocation: calling the stored transport as a class method supplied an invalid receiver. A receiver-sensitive regression failed before the fix and passes after it.
- [x] Publish sign-in completion once across concurrent account-boundary mounts.
- [x] Tag session broadcasts with a tab source and ignore this tab's own broadcasts. Separate BroadcastChannel objects in the same tab receive each other's messages; the old listener invalidated its own newly created session.
- [x] Release the lifecycle mutation guard before notifying subscribers of completed sign-in/logout so remounted consumers can read settled state.
- [x] Verify 59 targeted tests and TypeScript checks; rebuild and restart the isolated student server.
- [x] Browser evidence during diagnosis: original error reproduced; fixed native fetch restored the welcome page; central form submitted successfully; retry reached the real student Home; authenticated reload and profile navigation worked.
- [ ] Final browser acceptance after broadcast/logout fixes: fresh login reaches Home without retry, reload persists, logout returns to welcome, subsequent login works. Browser access was disabled again after the final build; user has agreed to re-enable it.

Profile navigation also exposed failures loading graduation status and practice sharing preferences. These are separate unresolved observations, not covered by the login fix.

The prior same-origin proxy change remains in the local configuration. Its HTTP success alone is not evidence of rendered browser acceptance. No production deployment was performed for this repair.
