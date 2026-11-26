# Quality evidence and test plan

Scope: design, checked-in runtime asset files and onboarding. Gameplay tests begin with Codex Cloud S01. Art targets are static compositions from exported assets. They do not establish in-game visual quality. Manifest verified refers to file integrity/metadata checks, unless explicitly supported by a later stage result.

## Pack evidence

| Check | Status | Evidence |
| --- | --- | --- |
| Asset decodes, dimensions, atlas geometry, pivots, transparency, clip mapping | PASS | tools/validate_pack.py and [asset validation](asset-validation.json) |
| Both audio codec variants, decoded peak, duration and seam sample bounds | PASS | FFmpeg decode in asset-validation.json. Browser playback and audible loop quality pending. |
| Level record counts, bounds, embedded anchors, gap and checkpoint spacing | PASS | Layout checks in asset-validation.json. Actual traversal and tuning pending. |
| Registry draft parsed and intended public/development filter checked | PASS | [Registry verification](registry-validation.json) against inspected repository parser |
| Art assembly inspection and title production | PASS | [Fernlight](../assets/concept/fernlight-target.webp), [Willow](../assets/concept/willow-target.webp), [Oak](../assets/concept/oak-target.webp); actual runtime files composed for offline review. |
| Phaser import, frame stability during motion, gameplay budget, playability or live preview | NOT_RUN | Game implementation belongs to Codex Cloud. |
| Producer G0 acceptance, public release rights and remote publication | BLOCKED | Awaiting approval and authorized implementation. |

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
