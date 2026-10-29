# Batch 02 — account/cache isolation

22 October 2026. Local candidate only; no production change.

## Completed

- A fresh QueryClient and freshly mounted application subtree on detected account transitions. Cleanup cancels old queries, clears the old cache and unmounts page-owned state/media effects.
- Browser draft storage is cleared before mounting a different account. A same-account reload retains its existing storage marker; unknown token formats cannot reuse a persisted owner marker. First visit after this update conservatively clears legacy unmarked browser drafts.
- Shared API hooks reject operations captured by an obsolete account before dispatch and after completion. Axios rejects stale responses and prevents a delayed old-account refresh from replacing tokens, retrying under a new account or logging out that account.
- Same-account token refresh preserves current task/cache. Samvaad JWT `sub` is a constant, so it is not used as the user identity. Email/username claims are used only for client isolation; server validation remains authoritative.
- Token utilities announce local changes and send a credential-free BroadcastChannel notice. Focus, pageshow, visibility and 500ms cookie polling provide fallbacks. Explicit logout invalidates even rapid same-account re-login.
- The auth context no longer exposes a cached user when the token is absent.

## Verification

12 new tests in `tests/account-isolation.test.tsx` and `tests/account-transport-isolation.test.ts` cover identity distinction, same-account refresh, old cache/effect cleanup, delayed responses, storage ownership, focus-driven detection, explicit logout, refresh success and refresh failure races. The transport tests use real Axios interceptors with synthetic adapters, not a live identity service.

Full student suite: 363 passed across 34 files. TypeScript passed; release lint has zero errors and one existing useQuestionAttempt cleanup warning. Optimized webpack build passed (35 static outputs). Standalone TypeScript initially overlapped generated-file replacement during the build; rerunning after build completion passed.

## Still unchecked

- Actual two-tab/Back/bfcache/browser-suspension acceptance with authenticated local accounts; browser access remains disabled.
- Raw `fetch`, direct Axios and feature-specific asynchronous callbacks outside the shared API client need an exhaustive transport review. Unmounting prevents old state from rendering, but it does not by itself cancel an already accepted server mutation or every callback side effect. O04 remains open as an overall finding until this follow-through is complete.
- Server-side token revocation, cross-service login integration and real role/enrollment refresh acceptance are separate from client cache partitioning.
- Polling is not instantaneous and background tabs can be throttled. Focus/pageshow and request-time guards mitigate this; physical/browser behavior must be tested rather than inferred.

Next: complete O04 transport-bypass review before moving to legacy drill idempotency (O02).
