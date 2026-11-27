# G2 vertical slice QA

Tested build source `19d642819558d9c150b2eb40f77ba8e23e3f7b38`. Candidate source rebased onto Studio V5.2 as `49f0bbca7f4b1d8e566280dd3218284d7b45501d` and rebuilt. All 29 static files matched the tested build by SHA-256. The subsequent evidence commit updates production records and screenshots.

- Environment: Node 24.22.3, pnpm 11.25.0, Debian Chromium 156.0.8078.79. Desktop 1366×768. Chromium touch emulation at 844×390 and 390×844, DPR 2. Candidate served at `http://127.0.0.1:4177/ai-game-studio/games/monster-survivor/`.
- The verified build is 5,362,410 bytes, including lazy audio and cover. HTML, script, CSS, opening illustration and four atlas/ground image requests total about 1.39 MiB before HTTP compression. Source, concepts and test fixtures are excluded. Under representative physical target hardware the standing performance budgets are unmeasured.
- Seed 1807 hit the authored 04:00 Warden schedule and cleared at 04:03.78 with 434 kills, 110 HP and Comet Thread I. The browser replay used normal keyboard and menu events. An external test driver supplies deterministic seed and frame timing, with no gameplay test hooks in the published bundle. The real-time paced replay finished in 248.93 seconds of wall time including drafts and terminal checks. A separate controls suite used the native browser animation clock.

| Requirement | Test IDs | Result and observed behavior |
| --- | --- | --- |
| MS-000 · exact import | T01 | PASS. Trusted additive validator on both main revisions. Pack validator unit tests and 38 committed asset hashes matched. |
| MS-110 · walk, dash, combat | T02–T04, T08 | PASS. Normalized motion, swept dash stop, cooldown, guard/grace, fixed-step cadence, locked scarab windup and spawn cap. Native-clock Chromium tested keyboard movement, dash and loss-of-focus pause. |
| MS-120 · XP and upgrades | T05 | PASS. Dart kills produced embers, XP overflow queued another draft, first legal spell choice appeared and the reward froze active time. Keyboard selected cards in the full browser run. |
| MS-210 · objective and endings | T07, T09–T10 | PASS. Orchard charge hold/decay, boon before level choices, Warden Cleave and Toll transition, real victory and HP defeat, time/rite loss in simulation, safe sector and retry. Same-tick defeat takes priority over victory. |
| MS-220 · evolution and saves | T06, T12 | PASS. Thornback and catalyst route evolved Comet Thread through the browser UI. One catalyst spent, Dart slot replaced, Later preserved catalyst. Idempotent result records, future/corrupt/blocked storage and sibling key isolation tested. |
| MS-310 · art, audio and accessibility | T11, T13–T15 | PASS for automated scope. Atlas failure gave a retryable error. All 20 WAVs passed PCM format and clipping checks, with loop boundaries checked against metadata. Chromium confirmed gesture gating, actual WAV decode and output mute. Settings persisted after reload. Captures were reviewed at gameplay size. Listening assessment and 200% zoom sweep remain NOT_RUN. |
| MS-320 · complete slice and touch | T14, T16 | PASS. Full authored schedule, victory and HP defeat, same-session retry, two concurrent touch pointers, cancel clears input, portrait pause and resume, Game Library return. Zero page or HTTP faults on the expected success paths. Physical device and cross-browser runs remain NOT_RUN. |
| Studio build and isolation | T20–T21 | PASS. Frozen install, lint, root/game strict typecheck, 50 Studio tests, 12 trusted pack tests, 11 slice tests, independent build, canonical Pages assembly, V5.2 state checks, six portal cases and eight Forest Adventure browser cases. Real Pages artifact excludes Monster Survivor. Forest Adventure loaded, played and returned, with existing save bytes preserved. Trusted scope checker passed. |
| Producer review and later content | T17–T19 | NOT_RUN. Producer G2 playtest pending. Normal mode, broader content and release performance work are outside this slice. |
| Live deployment | T22 | NOT_RUN for this game. Direct workspace observation of the live Studio build marker was BLOCKED by HTTP 403. Canonical assembly was verified locally. |

## Gameplay captures

[Title](evidence/title.png) · [Combat](evidence/combat.png) · [Draft](evidence/draft.png) · [Evolution](evidence/evolution.png) · [Warden Cleave](evidence/boss.png) · [Victory](evidence/victory.png) · [Defeat](evidence/defeat.png) · [Settings](evidence/settings.png) · [Touch](evidence/touch.png)

## Reproduction

Run the pinned toolchain from the Studio root. For the two game browser scripts, serve the built game at the URL above. Expose the assembled Studio portal and its Forest Adventure output at the same origin for the return and save checks. Keep the private projection outside the canonical assembled output.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
python3 -B -m unittest discover -s scripts/tests -p 'test_game_pack.py'
pnpm --dir games/monster-survivor typecheck
pnpm --dir games/monster-survivor test
pnpm --dir games/monster-survivor build
pnpm build
STUDIO_PAGES_BASE_SHA=$(git rev-parse origin/main) pnpm assemble:pages
pnpm verify:pages
node scripts/game-state.mjs
pnpm --filter @studio/forest-adventure build
STUDIO_PAGES_BASE_PATH=/ai-game-studio/ STUDIO_TEST_ASSEMBLED_PAGES=1 STUDIO_CHROMIUM_PATH=/usr/bin/chromium pnpm exec playwright test
STUDIO_TEST_ASSEMBLED_PAGES=1 STUDIO_CHROMIUM_PATH=/usr/bin/chromium pnpm exec playwright test --config games/forest-adventure/playwright.config.ts
cd games/monster-survivor
STUDIO_CHROMIUM_PATH=/usr/bin/chromium MS_REALTIME=1 node tests/slice-browser.mjs
STUDIO_CHROMIUM_PATH=/usr/bin/chromium MS_FOREST=1 node tests/controls-browser.mjs
```

The first post-rebase onboarding run failed because the local shell exported the outer repository commit into the synthetic fixture. The rerun used the workflow’s narrower assembly-only environment and passed all six portal cases. No Studio source change was needed.
