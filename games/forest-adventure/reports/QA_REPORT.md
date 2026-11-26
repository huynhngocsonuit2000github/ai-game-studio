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
| Public redistribution | BLOCKED | Producer authorization is pending. [D06](../production/DECISIONS.md) |
| Forest Adventure runtime, listening, playtest and deploy | NOT_RUN in S00 | S00 verified the pack and static art targets. See the S01 runtime evidence below. |

## S01 evidence · 2026-11-26

S01 base `9b7ff0e9dd8e89b8d449587ed2cf197f303577ad`. The PR head identifies the candidate. Tested Chromium 156.0.8078.79 on Debian 13 at 1366×768 and 960×540 with Node 24.22.3 and pnpm 11.25.0. Phaser renders the supplied atlases. A single 60 Hz kinematic simulation owns movement, solid contacts and gameplay events.

| Case | Status | Observed result |
| --- | --- | --- |
| Q01 | PASS | The game launched from the Studio development catalog at `/ai-game-studio/`. The cover and all 12 requested runtime media files loaded under the game path. Play started focused. Console, page and request checks were clean. |
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
- Gameplay screenshots `fernlight-trail.png`, `lantern-checkpoint.png`, `closed-gate.png`, `open-gate.png` and `trail-cleared.png` are retained with the SHA-stamped local candidate in `test-results/s01-evidence/`. Run the game browser tests to capture them again from the branch. The Producer directed the team to keep the preview local pending rights clearance.
- Public Pages preview is blocked on redistribution rights. Trusted merge scope also awaits the exact-head Studio approval for the registry and lockfile paths. Representative laptop performance, browser audio, and the Producer playtest remain stage checks.

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
