# Build 27 — interview setup contracts and safe legacy reentry

Implemented 20 October 2026 in the student release candidate. Production remains unchanged.

## Acceptance findings and fixes

The role picker previously presented an API failure as if no assessment roles existed, retained unscoped catalogue data and allowed a late creation callback to navigate after account/purpose changes. Missing published counts could fall back to five; practice creation could default an unconfirmed response mode to practice. The legacy reattempt screen selected cached questions under the original sitting ID without creating a new authorized sitting.

Setup now requires a recognized purpose and authenticated account. An omitted mode keeps the existing practice default; an explicitly unknown mode is recoverable rather than silently becoming practice. Account and purpose changes remount selection, difficulty, resume/count settings, preflight and request state. Catalogue queries are account/purpose scoped, abortable, non-retained after unmount and do not automatically retry. Pending catalogue refresh hides the previous setup until a fresh result is available.

Loading, API failure, malformed/duplicate catalogue and successfully loaded empty catalogue are distinct. A failed role check does not assert that no assessments exist. Profiles still require explicit matching purpose. Published counts must be whole numbers 1–50; missing/invalid counts disable that published option rather than inventing five. Curated technical roles without published difficulty evidence offer no arbitrary levels. Free practice retains all supported levels and a user-selected N from 1–10. Nontechnical flow behavior remains separately routed.

Both creation flows verify a canonical positive safe-integer returned ID, explicit matching practice/assessment mode and exact requested/published N before navigation. Rapid clicks share one in-flight guard and pending setup inputs are disabled. Late callbacks from a departed account/purpose cannot navigate or write question storage. Nontechnical creation continues through server resume/checkpoint reads of the persisted snapshot rather than copying returned questions into session storage.

Explicit input/access/rate-limit rejections recheck the catalogue and allow reviewed correction. Timeout/service/conflict or unverifiable success responses become an uncertain-create recovery: a sitting may already exist, so check History before starting another. The page does not automatically repeat the mutation or claim the first sitting was never created. Existing global token-refresh behavior is unchanged.

## Legacy reattempt compatibility

The old reattempt page now explains that completed interviews retain their original evidence and links to fresh Practice setup or History. It makes no question/API requests and writes no selected-question cache. Assessment links cannot become a practice-labelled reopen through that screen. This replaces a misleading legacy UI, not an implemented server-backed selected-question replay feature. Future targeted replay must create a distinct, authorized practice sitting with its own immutable question plan; it remains separate work. Existing backend answer/navigation/lease guards remain authoritative for direct or old cached interview links.

## Verification

219 student unit tests passed, including 22 new creation/count contracts. The final Chromium suite passed 84 cases, including 21 new setup/reentry cases. TypeScript, full lint/format checks, webpack production build and diff checks passed.

New cases cover failed versus empty catalogue and retry, invalid purpose, signed-out recovery, malformed/duplicate catalogue, exact-N technical and nontechnical assessment creation, purpose/count/ID mismatches, uncertain creation without automatic duplication, explicit 422 correction, account/purpose changes during creation, double clicks, legacy reentry without question reads/cache, invalid published counts, missing technical level metadata and selected-role reset. Free practice travels through fake-browser microphone/playback checks and submits exactly seven selected questions. Existing completion/history/voice/practice/guide regressions remain included.

320px technical/nontechnical setup screenshots were reviewed and overflow checks passed. These use actual components with synthetic identities/API responses and browser fake media. They do not establish physical microphone/speaker behavior, authenticated shell design acceptance, provider quality or real enrollment access.

## Limits and remaining work

This is client contract and recovery enforcement. It neither grants access nor changes backend purpose/count enforcement, publication, course enrollment or session leases. Same-view duplicate suppression is not durable creation idempotency across reloads/devices. An accepted request may finish after navigation; History is the recovery path. Full role/scope freshness still depends on the authoritative API and next request; this is not a push revocation channel.

No backend, dashboard, central, migration, historical-data, role-grant, AWS or production change. Unchanged suites were not rerun. Preexisting ops/**pycache** files remain untouched. AWS relocation stays deferred; companion/media/Jev retain their separate plans.

Authenticated central/Sampark staging, real device/provider/screen-reader/load acceptance and coordinated rollout remain open. The seven historical staff course assignments still require approved mappings. Build 27 is the eleventh batch against the post-Build-16 estimate in REMAINING-DELIVERY.md, not a reset. These targeted fixes close identified acceptance gaps; they do not certify all platform edge cases or production readiness.
