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
| Forest Adventure runtime, listening, playtest and deploy | NOT_RUN | S00 deliverables are the verified pack and static art targets. The Studio smoke used portal and isolated onboarding fixtures. S01 supplies the first playable game. |

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
