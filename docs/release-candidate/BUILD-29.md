# Build 29 — active interview context and speech callback lifetime

Implemented 20 October 2026 in the student release candidate. Production remains unchanged.

## Delivered candidate contract

ACTION-CONTEXT-01 from Build 28 is implemented for the mounted interview view and its follow-on actions. This closes the identified client lifecycle gap in candidate code; authenticated source/device/provider acceptance remains open.

The active page now requires a signed-in account, canonical positive safe-integer sitting ID and recognized purpose. A missing purpose is accepted only for a canonical restore, where the server resolves it. Invalid/missing fresh purpose, malformed IDs and legacy reattempt links offer History recovery without invoking interview APIs. The interview subtree is keyed by authenticated account and route context, so a context change removes old questions, question-attempt state, recording UI, timers and local control state.

Page-owned generation, restore, begin, navigation, pause and completion requests use a mounted-view AbortController. Guards before further actions and after asynchronous results prevent departed views from navigating, modifying optional caches, applying checkpoints or launching another request. Completion and pause callbacks verify the view before clearing a lease or navigating. A navigation result received after departure cannot trigger completion in the new view. Permission/fullscreen callbacks must still belong to the view before activation proceeds.

Question generation includes the explicit URL sitting ID instead of selecting an unspecified active interview. Generated/canonical checkpoints must match the requested sitting. Canonical resume purpose is verified rather than defaulted from an unknown response. Old selected-question URLs now restore server order; the active page no longer reads browser-cached question subsets after restore failure, and no longer writes canonical questions into the legacy unscoped browser question cache. Denied restoration therefore cannot expose that cached fallback. Backend ownership, question plans, enrollment, leases and deadlines remain authoritative.

Footer upload, speech-retry and analysis requests use the same component-lifetime pattern. A late upload result cannot launch follow-up insertion or analysis from a departed question/account view. The existing answer draft and durable-server-save contracts are unchanged; cancellation does not prove that a server save was never accepted.

## Speech recovery

Speech results and audio/browser-utterance events are tied to their originating invocation. Stop, text change, disable or unmount invalidates older responses and events. An old ended/error/start callback cannot change the current question's speaking/input state. Stopping during supplied-audio loading cannot start a subsequent provider fallback. View departure aborts the owned provider transport where supported and discards any late result.

The eight-second preparation watchdog now invalidates overdue speech before releasing input, so late provider audio cannot start over a student's answer. Successful audio/browser start clears that preparation watchdog, preserving long playback rather than cutting it off at eight seconds. Stopping detaches owned audio handlers, pauses it, releases its blob URL and cancels owned/queued browser speech through the existing global synthesis API. Voice preference storage failure uses the configured default; it does not crash the introduction or speech request.

## Verification

- 242 student unit tests passed, including ten new lifetime/speech cases.
- The full Chromium suite passed 103 cases, including 13 new actual-active-page cases.
- TypeScript, full ESLint, Prettier/diff checks and webpack production build passed.

Unit cases exercise transport abortion, stable mounted guards, late provider audio after stop/unmount, old media/utterance events, delayed-provider watchdog recovery, long successful playback, supplied-audio cancellation and blocked voice storage.

Browser cases exercise the actual interview page with synthetic owned checkpoints: invalid links without API calls, denied restoration with a seeded cached private question, late completed restore after account change, explicit generation ID and mismatched checkpoint, sitting changes after activation, delayed navigation/completion across both account and sitting changes, and completion despite blocked optional storage. Existing real-browser MediaRecorder/fake-microphone, monitoring, setup, completion, history and guide cases remain included.

The browser fixture stubs only the animation component in addition to existing synthetic auth/API/tracking. It does not stub the interview page's navigation, completion, checkpoint or answer-control logic. The fixture navigation adapter was made stable to match Next router identity. TTS lifecycle unit cases use synthetic media and provider results. None of this establishes real central identity, physical audio/camera, live provider timing, screen readers, full authenticated shell design or representative load.

## Limits and remaining gates

An accepted server request can finish after cancellation/navigation. Abort and client fencing prevent stale UI and follow-on effects; they do not roll back accepted writes, guarantee exactly-once provider use or cancel browser-owned permission/fullscreen prompts. Supplied-media loading can continue until its bounded timeout; stale audio is not played. The speech synthesis API remains page-global. Existing server idempotency/version/lease checks must remain in place.

Identity remounting reacts to the auth provider's reported account state. It is not instantaneous detection of a cookie change or a remote revocation. Resume errors do not erase saved evidence; offline cached question review is intentionally unavailable until canonical access succeeds. Deeper checkpoint schema validation, calibrated integrity/human review and end-to-end source/provider/device/load acceptance remain separate gates. No new assessment lease policy or cheating guarantee is introduced.

No backend, dashboard, central, schema, role-grant, AWS or production change. Those unchanged suites were not rerun. Preexisting ops/**pycache** files remain untouched. AWS relocation stays deferred; seven historical staff memberships still need approved course mappings. Companion/media/Jev retain their separate plans.

Next: coordinated authenticated staging/source acceptance and actual voice/device/provider/load checks, followed by fixes and rollout evidence. Build 29 is the thirteenth batch against the post-Build-16 estimate in REMAINING-DELIVERY.md, not a reset or a declaration that the pilot is ready.
