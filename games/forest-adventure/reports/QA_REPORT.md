# Quality evidence and test plan

Scope: design, checked-in runtime asset files and onboarding. Gameplay tests begin with Codex Cloud S01. Art targets are static compositions from exported assets. They do not establish in-game visual quality. Manifest verified refers to file integrity/metadata checks, unless explicitly supported by a later stage result.

## S00 evidence · 2026-11-26

Tested in the candidate worktree based on `4bfdb37c79b921ea63efdcdaf1e3c9e1185aeeaf`. Node 24.22.3, pnpm 11.25.0, Python 3.12.14, Pillow 13.0.0, NumPy 2.3.5, FFmpeg/ffprobe 7.1.5 and Chromium 156.0.8078.79 on Debian 13. The candidate SHA is the S00 PR head.

| Check | Status | Evidence |
| --- | --- | --- |
| Source, runtime and layout validation | PASS | `python3 games/forest-adventure/tools/validate_pack.py --check` matched 9 source masters and prompts and decoded 3 static targets. The manifest matched 58 files and 5,585,284 bytes. The validator checked 14 runtime images, 60 atlas frames, 32 audio bitstreams (codec, duration, peak and decoded loop seam bounds), and 3 layouts. Regenerating the evidence in a scratch copy yielded the original [asset report](asset-validation.json) and manifest byte-for-byte. |
| Registry draft and scope | PASS | `node --test games/forest-adventure/tools/validate_registry.test.mjs` passed 7 assertions against the Studio parser and changed-path checker. [Registry verification](registry-validation.json) |
| Static art inspection | PASS | Reviewed all three compositions, cover and sample Pip and terrain atlases. [Fernlight](../assets/concept/fernlight-target.webp), [Willow](../assets/concept/willow-target.webp), [Oak](../assets/concept/oak-target.webp), [cover](../assets/runtime/cover.webp) |
| Studio frozen install, lint and typecheck | PASS | `pnpm install --frozen-lockfile`, `pnpm lint` and `pnpm typecheck`. Used the workspace-local pnpm store via the store-dir option. |
| Studio unit and script tests | PASS | `pnpm test` passed 35 Vitest tests and 6 Node tests. |
| Portal and Pages build | PASS | `pnpm build`, `STUDIO_PAGES_BASE_SHA=$(git rev-parse origin/main) pnpm assemble:pages` and `pnpm verify:pages`. Pages verification found the index and 3 site-relative assets. |
| Studio browser smoke | PASS | `STUDIO_CHROMIUM_PATH=/usr/bin/chromium STUDIO_PAGES_BASE_PATH=/ai-game-studio/ STUDIO_TEST_ASSEMBLED_PAGES=1 pnpm exec playwright test` passed 5 tests. The first run passed 4 and hit an unwritable default pnpm data directory in the onboarding fixture. Rerunning all 5 with `XDG_DATA_HOME` set to a writable temporary directory resolved it. Screenshots are in the ignored `test-results/` directory. |
| Studio registration | BLOCKED | Canonical registry has no Forest Adventure entry. Studio approval is required to add the validated draft. [Integration instructions](../production/STUDIO_INTEGRATION.md) |
| G0 initial scope | PASS | The Producer approved the reduced three-level scope. [D03](../production/DECISIONS.md) |
| Public redistribution | BLOCKED in S00 | Producer authorization was pending in S00. [D06](../production/DECISIONS.md) |
| Forest Adventure runtime, listening, playtest and deploy | NOT_RUN in S00 | S00 verified the pack and static art targets. See the S01 runtime evidence below. |

## S01 evidence · 2026-11-26

S01 base `9b7ff0e9dd8e89b8d449587ed2cf197f303577ad`. The PR head identifies the candidate. Tested Chromium 156.0.8078.79 on Debian 13 at 1366×768 and 960×540 with Node 24.22.3 and pnpm 11.25.0. Phaser renders the supplied atlases. A single 60 Hz kinematic simulation owns movement, solid contacts and gameplay events.

| Case | Status | Observed result |
| --- | --- | --- |
| Q01 | PASS | The game launched from the Studio development catalog at `/ai-game-studio/`. All 12 requested runtime media files loaded under the game path. The built cover was served as WebP. Play started focused. Console, page and request checks were clean. |
| Q02 | PASS | The simulation met held and tapped apex targets and the 100 ms coyote and 120 ms buffer windows. Chromium played held and tapped jumps with actual key events and tested focus and resize. |
| Q03 | PASS | Simulation verified one beetle stomp and bounce, stomp priority, side damage, the 900 ms damage lockout and that the moth cannot be stomped. The browser route stomped the beetle and took one moth hit on the return to the open portal. |
| Q04 | PASS | Simulation rejected the gate at 0, 1 and 2 seeds and cleared once on the third. Chromium reached the locked gate with two seeds, backtracked for the third and entered the open portal. |
| Q05 | PASS | Fall and empty-heart simulation cases each respawned once after 650 ms at the lantern with full hearts, preserved pickup IDs and an advancing attempt timer. Chromium deliberately fell and returned to the lantern with its two seeds and six fireflies. |
| Q06 | PASS | The keyboard route cleared all three gaps, climbed and rejoined from the high route, backtracked from the closed gate, collected eight fireflies and cleared in about 21 s of attempt time with one fall. |
| Q07 | PASS | Chromium paused with P, Escape and a window blur event, resumed explicitly, and verified a frozen canvas, paused time and ten confirmed restarts with one canvas and reset counters. |
| Q08 | PASS | Chromium tested the Studio detail link, direct built entry, relative media and return to the Studio library at the project subpath. |

- `pnpm --filter @studio/forest-adventure typecheck`, `pnpm --filter @studio/forest-adventure test` (16 tests) and `STUDIO_CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @studio/forest-adventure test:browser` (2 Chromium tests; includes Vite build) passed.
- `python3 games/forest-adventure/tools/validate_pack.py --check` passed and matches all 58 supplied runtime artifacts. The S01 bundle includes the existing art, the working entry and the MIT notices for Phaser and eventemitter3. Vite reports a large minified Phaser chunk, approximately 326 kB gzip.
- Studio frozen install, lint, typecheck, `pnpm test` (35 Vitest and 6 Node tests), portal build, Pages assembly and verification, and the 5 Studio Chromium tests passed. The production assembly excluded the Forest Adventure development build.
- The first PR Pages run exposed a clean-checkout 404 for the catalog cover. CI now builds Forest Adventure after the public artifact is verified and before the local development catalog smoke. The catalog still uses the supplied cover.
- Gameplay screenshots `fernlight-trail.png`, `lantern-checkpoint.png`, `closed-gate.png`, `open-gate.png` and `trail-cleared.png` are retained with the SHA-stamped local candidate in `test-results/s01-evidence/`. Run the game browser tests to capture them again from the branch. The Producer directed the team to keep the preview local pending rights clearance.
- The original S01 candidate merged after the trusted scope check passed. D06 records subsequent authorization for S01 public visual assets. Public verification follows the Studio publishing PR. Representative laptop performance, browser audio, and the Producer playtest remain stage checks.

## Implementation matrix

Every case starts NOT_RUN. Store per-case result, command, environment, base/head SHA and evidence in the stage and checkpoint. Key smoke checks run on secure, per-PR read-only CI with subpath and local hosts. Test code may use a seeded development fixture with a fixed clock; no debug state shipped in production.

| ID | Stage | Method and expected result |
| --- | --- | --- |
| Q01 | S01 | Chromium boot, actual static branch build at the project subpath. Required assets return success, no console/page failures, keyboard focus begins at Play. |
| Q02 | S01 | Unit and browser. Left/right and jump keys produce correct input edges. Hold apex 88–99 px, tap 22–30 px, coyote 100 ms and buffer 120 ms within 1 tick. Repeat for resize and key repeat. |
| Q03 | S01 | Fixture and normal inputs. Stomp during descent, bounce once. Side hit takes one heart and starts 900 ms lockout. Test same-tick side/stomp priority; moth cannot be stomped. |
| Q04 | S01 | Keyboard runs for 0, 1, 2, 3 seeds. Gate rejects missing seeds with remaining count; third unlocks and finishes exactly once on overlap. Capture closed and open states. |
| Q05 | S01 | Independently force fall and zero hearts after a lantern. Exactly one respawn within 500–750 ms, full hearts, no hazard overlap, retained collectible IDs, timer and death counter correct. |
| Q06 | S01 | Real keyboard play over every mandatory L1 gap including backtracking. Verify optional path reconnect, 8 collectable fireflies, results match pickups and blocked gate remains escapable. |
| Q07 | S01 | Pause on Escape and tab blur. No movement or timer increments across pause. Explicit Resume, restart confirmation, ten loops with no duplicate handler. |
| Q08 | S01–S06 | Direct game entry, program route and Back to Studio at local/actual project prefix. No forbidden root-relative site assets, missing game requests or race between menu/navigation and canvas. |
| Q09 | S02 | Compare screenshots at 960×540, 1366×768 and 1920×1080 on target device. Check transition poses, native facing, foot alignment, tiles, HUD, cue contrasts, safe area and readable landing. |
| Q10 | S02 | Throttle and disable optional art in a fixture. Lost required asset produces reachable retry with no hard dead end. Capture art decode failures and pass legitimate recoverable paths. |
| Q11 | S02 | Keyboard and reduced-motion review. Operate all menus without mouse; no focus leak, controls named, critical status clear without color/flash/audio. Use contrast tool. |
| Q12 | S02 | Verify portals at 0/1/2/3 seeds, active lantern and each effect visually. Each pickup emits once and 200 effect bursts do not grow the pool unbounded. |
| Q13 | S03 | Chrome, Firefox and Safari where available. Audio unlock after Play, correct priorities, sample fallback (real M4A when needed), two audible loop wraps, instant mute, no stale voices. |
| Q14 | S03 | Five unaided L1 playtests, manual Producer sign-off, laptop traces and checks against TECH_DESIGN budgets. Record build/time/device and failed attempts by segment. |
| Q15 | S04 | Full campaign, replay, settings and bests across reload. Blocked storage/corrupt schema keeps a playable session. Locked levels do not launch by stale state; final clear recorded once. |
| Q16 | S05 | On each target browser, record cold load, transfer, p95 frame time, memory, multi-restart state, repeat decode and autoplay. Confirm zero P0/P1 or close stage as blocked. |
| Q17 | S06 | Run complete Pages assembly, compare all previous public game paths, rehearse revert, verify released commit marker and full playable live smoke after authorized merge. |

Defect evidence: ID, severity (P0–P3), actual SHA, OS/browser/device, steps, actual/expected result, screenshot or trace and regression ID. Stage PR includes test evidence and exact preview instructions. Any unavailable infrastructure is recorded with commands to reproduce. Producer acceptance remains independent of technical acceptance.

## S02–S04 combined candidate · 2026-11-26

Base `fbb9e318b094562b92f42c466ecb1d50b0884d52`. The implementation PR head identifies the candidate. Local evidence uses Chromium 156.0.8078.79 on Debian 13 with Node 24.22.3 and pnpm 11.25.0.

| Check | Result | Evidence |
| --- | --- | --- |
| Q01–Q08 | PASS | Simulation checked movement windows, stomp priority, damage lockout, gate conditions and recovery. Chromium cleared Fernlight through the catalog with eight fireflies, a deliberate fall and backtracking from a closed gate. It paused, resumed, resized and performed ten confirmed restarts. Return to Studio and the required relative asset requests passed. |
| Q09 | Checked in Chromium | In-game screenshots include Fernlight at 960×540, 1366×768 and 1920×1080. Reviewed the start, jump, run, lantern and gate, HUD fit and terrain. Integrated-device and monitor checks remain open. |
| Q10 | PASS | Forced failure of the required Fernlight backdrop produced the focused Retry screen. The same route booted after restoring the file. Failure of optional foliage left Fernlight playable. |
| Q11 | PASS (automated) | Chromium used Tab, Enter, Escape, Space and arrow keys in the modal settings, restored focus and persisted volume, mute and reduced motion on reload. HUD text and shape markers convey essential states independently of sound. |
| Q12 | PASS | L1 gate logic at 0–3 seeds passed. Captures show both gate states, a lit lantern, pickups, a moth and reduced health. A 960×540 Chromium stress run sent 200 jump inputs and monitored the atlas draws. Each landing effect rendered for 30–31 frames, then stopped. The canvas count stayed at one and the renderer reused its 12 effect sprites. |
| Q13 | PASS (automated Chromium) | Verified user-gesture AudioContext unlock, decoded loop sources and loop endpoints, pause fade, immediate mute, resume without duplicate loops and AAC request after induced Ogg decode failure. Audible loop wraps and Safari/Firefox playback were unrun. |
| Q14 | PARTIAL | Scripted Fernlight was cleared before campaign expansion. Cloud Chromium transfer and frame measurements are below. Five unaided first-time runs and representative-device traces remain open. |
| Q15 | PASS | Actual keyboard inputs completed the three maps in order, lit all lanterns, collected 24 fireflies and showed the finale. Checked each unlock, replay, Continue after reload, independent bests, invalid schema and blocked storage. |
| Packed media | PASS | The read-only pack validator checked 58 runtime files and all three layouts. Used supplied artwork and audio. The default Pages artifact uses S01-cleared media. |

`pnpm lint`, `pnpm typecheck`, `pnpm test` (35 Vitest and 6 script checks), Forest Adventure typecheck and unit suite (19 checks), and `python3 games/forest-adventure/tools/validate_pack.py --check` passed. Assembled and verified Pages under `/ai-game-studio/`; all six Portal Chromium checks passed, including public Forest Adventure launch. The local campaign suite passed six Chromium checks against a copy of the Pages artifact with the review build at the same game path. It uses real keyboard events and a controlled frame source for the later levels. Timing differences in the first automated replay were resolved in the test driver.

Run `STUDIO_CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @studio/forest-adventure test:campaign` from the repository root to rebuild the local candidate and recapture gameplay. The suite writes `fernlight-trail.png`, `willow-run.png`, `lantern-oak.png`, `oak-finale.png` and gate/checkpoint states under `games/forest-adventure/test-results/campaign-browser/`. The staged local review site is in `games/forest-adventure/test-results/campaign-site/dist/`. Serve it under the Pages prefix using the command in the game Playwright config. D06 limits public distribution to S01 media.

### Cloud performance and artifact boundaries

At 1920×1080, DPR 1, with the browser cache disabled and network emulated at 10 Mbps / 100 ms RTT, the final local review build reached Play in 2.62 s with 2.23 MB transferred. The campaign game files total about 6.60 MB on disk. An earlier two-minute Cloud Chromium traversal sample before deferring the optional foliage recorded 7,146 frames at 16.8 ms p95 and 8.13 MB JS heap. The final short sample also recorded 16.8 ms p95. These samples describe the Cloud environment. Target laptop traces and cold loads across target browsers remain open.

The public artifact contained 13 game media files. Every file matched a SHA-256 entry cleared for S01 in the manifest. The full campaign and its evidence remain local.

## S05–S06 candidate · 2026-11-26

Base `e8c20fb6ed114d8e2a25177ad967b4b5deb2ca4c`. The implementation PR head identifies the candidate. Tests used Debian 13, Node 24.22.3, pnpm 11.25.0, Chromium 156.0.8078.79, Chrome 158.0.8127.88, Edge 158.0.4370.45 and Firefox ESR 153.5.1.

| Check | Result | Evidence |
| --- | --- | --- |
| Q01–Q08 | PASS in Chromium | Simulation and keyboard tests cover held and tapped jumps, buffer/coyote time, stomps and contact, closed/open gate, falls, zero hearts, checkpoint respawn, pause and ten restarts. The assembled Pages artifact and the private review build both launch at the Studio project subpath. |
| Q09 | PASS in Cloud Chromium | Reviewed the three trail captures and finale, and checked canvas/HUD fit at 960×540, 1366×768 and 1920×1080. The portrait keyboard guidance is visible. The target laptop remains untested. |
| Q10 | PASS in Chromium | Forced required Fernlight and deferred Willow backdrop failures, then recovered via the focused Retry button. An unavailable decorative layer left play reachable. |
| Q11 | PASS for tested workflows | Keyboard settings, pause, restart and default Next trail focus passed. Reduced motion suppresses action fades and optional movement effects. Checked HUD, result and button text colors at 7.66:1 or higher for the tested combinations. |
| Q12 | PASS for game states | Tested the seed gate states, lit lantern and visible gameplay feedback. The two-minute stress run left one canvas. The dedicated 200-landing pool test is recorded against S02–S04 above. |
| Q13 | PARTIAL | Chromium verified user-gesture unlock, loop endpoints, pause/resume, mute and actual AAC decode/playback start after an induced Vorbis failure. Firefox decoded both loops in a BiDi smoke check. Its headless audio context stayed suspended. Chrome and Edge passed the same audio suite. Audible loop seams and Safari playback remain open. |
| Q14 | PARTIAL | Completed the scripted campaign and Cloud performance run. Five unaided first-time playtests, first-clear timing, target device metrics and manual Producer review remain open. |
| Q15 | PASS in Chromium | Cleared all three trails with all 24 optional fireflies, reached the finale, and verified replay, Continue, independent bests, corrupt save recovery and blocked storage. Tests confirmed the title only offers unlocked trails. |
| Q16 | PARTIAL | See the Cloud trace results below. Firefox BiDi smoke also covered play, a keyboard pickup, pause, restart, resize and return. The Playwright browser downloads returned HTTP 403, and stock Firefox ESR rejected a media emulation command in the full suite. Chrome and Edge passed the seven-case campaign suite. Safari coverage and representative-device budgets remain open. |
| Q17 | PASS locally, live check BLOCKED | Clean build, assembly and verification passed. Rebuilt the prior main in a detached worktree and compared public manifests and entry paths. The 13 shipped game media files match their D06-cleared manifest hashes. Full campaign publication and candidate live smoke require rights, trusted scope authorization, Producer acceptance and authorized merge. The Cloud request to the existing live Pages endpoint returned HTTP 403. |

Frozen install, Studio lint and typecheck, 35 Vitest tests, six Studio script tests, 19 Forest Adventure unit/registry tests, and the read-only pack validator passed. The pack validator checked 58 files, 60 atlas frames, 32 audio bitstreams and three level layouts. Six Studio Chromium tests, two public-preview game tests and seven private campaign tests each on Chromium, Chrome and Edge passed. The campaign shares its static subpath with Pages and keeps the production art and audio outside the default public build.

Run `STUDIO_CHROMIUM_PATH=/usr/bin/chromium pnpm --filter @studio/forest-adventure test:campaign` from the repository root to rebuild the private artifact and recapture `fernlight-trail.png`, `willow-run.png`, `lantern-oak.png` and `oak-finale.png` under `games/forest-adventure/test-results/campaign-browser/`. The Playwright config serves the review build from `test-results/campaign-site/dist/`; select `FOREST_TEST_BROWSER=firefox` or `webkit` when the corresponding Playwright browser is installed. Campaign screenshots remain in workspace evidence under D06.

### Cloud Chromium measurements

Measured the game build at `d242e35` using headless Chromium on Debian 13 / AMD EPYC at 1366×768, DPR 1. Three cold loads at 10 Mbps and 100 ms RTT, with browser cache disabled, reached the usable menu in 2.446 s, 2.341 s and 2.338 s. Each transferred 2,232,754 bytes. The static game directory was 6,603,495 bytes. Estimated concurrently decoded source images were 33.7 MiB, using four bytes per pixel and a maximum of two resident far backdrops.

The 124.1 s real-clock Fernlight keyboard traversal and restart stress recorded 7,378 frames at 16.7 ms median and 16.8 ms p95. After 29 confirmed restarts, one canvas remained and post-GC JS heap was 6.35 MiB. There were no failed requests or page exceptions in that run. These values meet the numeric limits in the tech design for the measured environment. Representative hardware coverage is open.

## Release checkpoint

The public Studio catalog remains In Development. No gameplay blockers surfaced in the covered Chromium flows. The incomplete support matrix, device measurements, live verification and Producer gates leave G3/G4 open. Review the exact PR build locally. Then record campaign redistribution rights and trusted Studio authorization before changing public media and registry fields. After manual acceptance and an authorized merge, confirm the live SHA, launch the published game through Studio and verify its return path. Use the prior public main above as the rollback baseline.
