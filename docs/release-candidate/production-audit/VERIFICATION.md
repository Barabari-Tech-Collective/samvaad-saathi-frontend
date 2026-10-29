> **Batch 02:** account/cache and shared-transport protections are implemented with 12 new regressions (363 student tests passed). O04 remains open for direct-transport review and actual two-tab browser acceptance. See [batch details](BATCH-02-ACCOUNT-ISOLATION.md) and [tracker](FIX-TRACKER.md).

> **Batch 01 follow-up:** 351 student tests across 32 files passed, including 9 new PDF profile-save regressions. Student optimized build and TypeScript passed; release lint has zero errors and one existing warning. Backend/dashboard code was unchanged in this batch; earlier results below are historical, not rerun. See [FIX-TRACKER.md](FIX-TRACKER.md).

# Verification — 22 October 2026

## What ran

Final values are recorded after the command results, not inferred from file inventory. All tests use synthetic fixtures. No production learner-data mutation, live AI generation, load attack or browser session was used.

| Check | Result / scope |
|---|---|
| Student Vitest/jsdom | 342 tests, 30 files passed; 46 tests added in this pass across seven production-* test files |
| Samvaad backend unit tests | 1,133 passed, including 15 new PDF renderer safety tests; uses `ops/ci_tests.py` synthetic settings |
| Real PDF render | Actual installed xhtml2pdf/pypdf smoke passed: escaped literal text extractable, 150-paragraph document paginated, final marker preserved. This is not Hindi-font or full résumé-template acceptance |
| Dashboard Node tests | 37 passed; validators and existing source contracts, not browser user journeys |
| Student optimized build | `npm run build -- --webpack` passed; 35 generated static outputs |
| TypeScript | Student and dashboard checks passed |
| Student release lint | No errors; existing effect-cleanup warning in `useQuestionAttempt.ts:109` remains |
| Whitespace | `git diff --check` passed for student, dashboard and backend |
| Browser / screenshots | NOT RUN — user kept browser access disabled |
| Actual phone / native VoiceOver | PENDING — unavailable / deferred by user |
| Real SQL/HTTP cross-service suites | NOT rerun in this pass; earlier build evidence must not be conflated with latest candidate acceptance |
| Provider evaluation/load/Google admission | NOT RUN; separate gates remain |

Backend suite emits existing dependency/deprecation and AsyncMock warnings; passing tests do not erase those warnings. Node/Vite emits existing module/config warnings. Production runtime/CI must also verify the exact candidate heads.

## New executable regression coverage

Paths below are relative to their repository roots.

| Repository / test | Cases | What it actually proves |
|---|---:|---|
| student `tests/production-export-safety.test.ts` | 7 | Literal untrusted text in downloaded analysis, invalid score handling, zero score/optional sections |
| student `tests/production-pronunciation-safety.test.tsx` | 14 | Explicit start, invalid query, blocked/quota storage, save retry deduplication, obsolete response, malformed data, recovery, final navigation |
| student `tests/production-recorder-lifecycle.test.tsx` | 8 | Deferred microphone grant, one capture, final-chunk wait/MIME, empty media, constructor/runtime failure, level change, cleanup |
| student `tests/production-drill-pages.test.tsx` | 10 | Invalid pacing level boundaries, stale creation response, structured late permission/upload, immediate track stop/MIME, runtime recorder failure |
| student `tests/production-logout-storage.test.ts` | 3 | Storage helper does not abort logout cleanup; preserves only guide preferences when accessible |
| student `tests/production-microphone-dialog.test.tsx` | 3 | Named native-dialog invocation, Escape handler, permission dedupe/denial, shared dialog lifecycle. Native methods mocked; real focus not measured |
| student `tests/production-api-error-privacy.test.ts` | 1 | API error telemetry does not carry original error/config/body/query-string secret |
| backend `backend/backend/tests/unit_tests/test_resume_pdf_render_safety.py` | 15 | Nested escaping, unsafe links, resource callback denial, route wiring, safe error, real text/PDF pagination |

## Re-run without a browser

Student repository:

```sh
npm test -- --reporter=dot
npm run lint:release
npm run build -- --webpack
node_modules/.bin/tsc --noEmit
git diff --check
```

Dashboard repository:

```sh
node --test tests/*.test.mjs
node_modules/.bin/tsc --noEmit
git diff --check
```

Samvaad backend repository (synthetic unit settings; no live database required):

```sh
.venv/bin/python -c 'import runpy, pytest; runpy.run_path("ops/ci_tests.py", run_name="audit_settings"); raise SystemExit(pytest.main(["backend/backend/tests/unit_tests", "-q", "--tb=short"]))'
git diff --check
```

Do not point database-mutating end-to-end fixtures at production. Existing SQL tests demand an explicitly isolated local test database; arrange and verify that target separately. Browser commands are deliberately absent because browser access remains disabled.

## Review limits

A component test cannot measure pixel placement, physical target size, codec interoperability, focus behavior of the actual browser, real permissions, screen-reader speech, actual provider quality or production load. The 85-case register keeps those acceptance results pending. The route inventory and pattern search are coverage aids, not proof every line or pixel is correct.
