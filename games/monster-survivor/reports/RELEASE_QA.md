# Normal release candidate QA

The Producer approved the live S03 preview at G2 and authorized the named S04–S06 batch. S04 and S05 reviews were deferred. G4 human playtest and explicit release approval remain pending.

## Candidate and coverage

Runtime tested at `04338c6ea786b5b46652c14cd82c1537b7d8b54e`. S04 functional checkpoint `ce61899f68109a4da2f2a98f3fbb6aa3f1398207`. Published S03 rollback base `ff54db362cc29e6e7f3796eaae04d695dbdd639c`. The S06 changes package evidence and add an assembled-site browser check.

| Requirement | Tests | Evidence |
| --- | --- | --- |
| MS-410 · Normal content | T04–T10 | PASS. Five normals, both elite timings, two of three rites, distinct boons, Overrun, pickups, full skill and recipe catalog, three Warden phases and attack patterns. Victory, HP loss, rite timeout, duel timeout and same-tick ordering exercised in simulation. |
| MS-420 · Records and v1 compatibility | T12 | PASS. S03 preferences, records, discoveries and scarf remained readable. A Normal clear added one record, preserved the earlier best and did not write Forest Adventure storage. Scarf selection and reduced graphics detail persist. |
| MS-510 · balance | T18 | PASS for four seeded clears and recipe coverage. Wave-end levels still exceeded the target by one to two levels. Shorter duels and two early evolutions remain below the design bands. The fourth build reached 181 concurrent foes including an elite or boss. |
| MS-510 · interaction | T13–T16 | PASS on Chromium 156. Desktop keyboard, twin touch pointers, touch cancel, rotation pause, settings, gesture audio unlock/mute, failed-atlas recovery, and restarts. Full Normal victory through keyboard and menu events, with an externally controlled frame clock over the authored schedule. |
| MS-510 · performance | T19 | PASS in this Cloud Chromium run. Physical device, system Firefox and Safari/WebKit acceptance remain open. Browser downloads for Firefox and WebKit returned HTTP 403. |
| Producer acceptance | T17 | G2 PASS for the live S03 preview under the Producer decision. G4 Normal human playtest and listening review NOT_RUN. |
| MS-610 · regression and rollback | T20–T22 | See the [release and rollback checklist](../production/RELEASE.md). Post-merge live Normal smoke is pending approval and manual merge. |

## Balance and timing

| Route | Seed | Outcome | Time | Wave-end level | Duel |
| --- | ---: | --- | ---: | ---: | ---: |
| Comet Thread | 1807 | Victory, 67 HP | 12:28.85 | 21 | 28.85 s |
| Crown of Glass | 306 | Victory | 12:41.93 | 21 | 41.93 s |
| Green Midnight | 1809 | Victory | 13:03.72 | 20 | 63.72 s |
| Lantern Pack | 308 | Victory | 12:54.40 | 20 | 54.40 s |

S04 seed 1807 finished at wave-end level 39 with an 11.1-second duel. S05 tapered later Normal ember values and reduced the Warden’s vulnerability outside recovery. First drafts on winning routes arrived around 16–19 seconds. The two recommended rite windows were broadly exercised, with actual timestamps in the [seed metrics](release-evidence/normal-balance.jsonl). The authoring bands are tuning targets. Human pacing and comparative build balance remain part of G4.

## Chromium performance

Headless 1366×768 Chromium 156.0.8078.79 on a five-vCPU Cloud AMD EPYC executor. DPR and replay time are listed in the browser tests. The test used native frame scheduling in the 08:00–09:30 window and sampled consecutive frames within input batches. The browser saw up to 48 foes in this run. The 181-foe figure is from the separate deterministic simulation.

- **Cold boot** 1,475,458 bytes before first input and 1.74 seconds at simulated 10 Mbps and 150 ms. Complete standalone output 5,376,268 bytes.
- **Dense combat** 59.9 median FPS and 16.73 ms p95 across 4,949 frame intervals.
- **Retained JS heap** 3.11 MB after the dense segment and 23,796 bytes of drift between the first retry and three additional restarts after garbage collection.
- **Decoded pixel estimate** 10.41 MB for the five decoded source rasters including the title art. Keeping those rasters and the ground cache, glow cache and DPR-1 gameplay canvas simultaneously would account for 28.05 MB of raw pixels. These are geometry estimates. GPU and compositor memory were unmeasured.

[Browser metrics](release-evidence/chromium-normal.json) · [04:00](release-evidence/combat-240.png) · [08:00](release-evidence/combat-480.png) · [Late wave](release-evidence/combat-690.png) · [Briar lanes](release-evidence/warden-2-lanes.png) · [Midnight toll](release-evidence/warden-3-toll.png) · [Victory](release-evidence/victory.png) · [Touch](release-evidence/touch.png)

## Reproduction

From the Studio root with the pinned toolchain and Chromium available:

```sh
pnpm install --frozen-lockfile
pnpm --dir games/monster-survivor test
pnpm build
pnpm assemble:pages
pnpm verify:pages
node scripts/game-state.mjs
STUDIO_TEST_ASSEMBLED_PAGES=1 STUDIO_CHROMIUM_PATH=/usr/bin/chromium pnpm exec playwright test --config games/monster-survivor/playwright.config.ts
```

For the full Normal trace, run `MS_PREVIEW=… MS_MEASURE=1 STUDIO_CHROMIUM_PATH=/usr/bin/chromium node tests/normal-browser.mjs` from the game directory. Use the assembled game’s project-subpath URL. The control suite runs with the native clock via `node tests/controls-browser.mjs`. An auxiliary Chromium replay of seed 308 lost synchronization with the Node driver while waiting for a draft. The seed’s complete Lantern Pack clear is simulation evidence. The full Chromium victory and pacing metrics above use seed 1807.
