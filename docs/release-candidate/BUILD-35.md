# Build 35 — practice companion and stable responsive interview canvas

20 October 2026. Student candidate only; no production deployment or provider change.

## Implemented

Saathi is a blue/yellow SVG character explicitly labelled AI and integrated into actual practice question/answer controls. Status is derived from real question playback/preparation, microphone permission/recording, saving, acknowledged answers, feedback work, paused controls and browser connectivity. It does not fabricate progress, scoring, emotion recognition or human presence. The figure makes no new model/provider requests and adds no separate audio stream.

Students can hide the character, pause face animation and mute/unmute practice question audio. Preferences store only versioned booleans under an account-scoped key, synchronize within/across browser tabs, reject malformed values and retain current-view choices if storage is unavailable. Server/hydration readiness keeps stored mute in place before practice question speech can start. Muting stops active playback. Hidden character mode preserves all answer and question-audio controls. OS reduced motion always suppresses animation. Controls support keyboard use and 44-pixel height.

The active question now uses one CSS-responsive component tree instead of mounting separate question/speech components on mobile versus desktop. Resizing therefore does not restart question audio or issue another provider request. Question/code panels use bounded columns; long question words wrap. The interview header stacks on narrow screens, preserving readable titles, and explicitly distinguishes untimed assessment from practice. Question-view tracking and speech reset were separated without changing ownership rules; latest analysis callbacks avoid stale dependency warnings. Release lint now covers these changed source components with real TypeScript and Hook checks.

The character is currently practice-only. Formal assessment question audio/policy does not inherit practice mute preferences. Neutral assessment presentation, actual learner/device/provider acceptance and human speaker ownership remain later gates. Companion controls currently affect question audio, not legacy introduction/warm-up speech. Character customisation and cross-device preference sync remain outside this increment.

## Verification

- Student unit suite: **259 passed**, 17 new cases compared with Build 29.
- Browser suite: **113 passed**, 10 new scenarios compared with Build 29.
- Targeted real TypeScript/Hook lint: passed without warnings; standard commit lint/format hooks remain required.
- Webpack production build and TypeScript after generation: passed.
- Responsive previews inspected at desktop and 390px; additional browser reflow/control cases cover 320, 768 and 1440px.

Browser tests cover actual MediaRecorder answer states through saving/acknowledgement, hidden/paused preferences after reload, OS reduced motion, offline/reconnect state, keyboard use, account switch isolation, stored mute preventing provider calls, no additional speech generation on resize, and absence of the companion/mute inheritance in formal assessment. Browser auth/API/provider responses are synthetic; physical microphones, live voices, screen readers and the complete authenticated shell still need validation. Unit storage tests use an explicit Storage adapter because this machine's Node runtime exposes incomplete experimental localStorage in JSDOM; real browser storage is exercised separately.

Screenshots in the planning verification directory show the actual interview page with synthetic checkpoints and a fixture auth shell. They are not production screenshots or final design acceptance for every role.

## Updated execution decisions

The user explicitly chose no hosted staging environment. Do not provision one. Continue disposable local source integration and browser checks, followed by an approved controlled production pilot and exact-release verification. This replaces earlier planning assumptions that required provisioning hosted staging; it does not justify guessed production staff grants or treating local tests as real-device/provider acceptance.

The user chose Google Meet in a separate tab for initial human interviews. Build that as an explicit external meeting format with truthful join/no-show/fallback behavior; it is not an embedded video room. Next implementation targets that flow. AWS account relocation remains deferred.
