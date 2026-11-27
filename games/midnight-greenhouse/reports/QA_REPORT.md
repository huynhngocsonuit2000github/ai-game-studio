# QA report

State at handoff: this is a production pack. Static verification passed for 35 listed art/audio/layout files and all three authored schedules. Asset checks decoded all images/audio, checked RGBA sprite anchors and file references, and inspected the three empty arena plates and static silhouettes. Supplied runtime assets total 2,137,759 bytes before integration. Decoded audio peaks span -16.7 to -6.4 dBFS. Browser audio playback and animation remain untested. Browser gameplay evidence is pending implementation.

| Test | Acceptance | State at handoff |
| --- | --- | --- |
| Q01 | Clean install/build via repository rules, click from real built candidate portal, return via relative link, no runtime console/network errors. | NOT_RUN |
| Q02 | Four lanes remain distinct. Legal placements charge once. Occupied, enemy-covered, insufficient and invalid placements never debit. Removing a plant refunds once at 25% floor. | NOT_RUN |
| Q03 | Combat opens after prep. Payout occurs on exact simulation interval, matching wet and dry income. Pause does not pay or count toward time. | NOT_RUN |
| Q04 | Verify only one wet lane through repeated input, 4 s cooldown, blocked requests, wet/dry damage and deterministic multi-target geometry. Raincoat never receives shock. | NOT_RUN |
| Q05 | Verify ranges, blocker/contact behavior, physical lob against armor, root/slow, kill stock awarded exactly once and escape at same-tick arbitration. Win after schedules and all live enemies clear. | NOT_RUN |
| Q06 | Play 1280×720 mouse/keyboard and minimum 844×390 landscape touch. Check all board edges, focus and rotate hint, reduced motion, readable HUD and Vietnamese labels with correct diacritics. | NOT_RUN |
| Q07 | Start L1, intentionally lose after three breaches, retry then finish. Pause and return from tab without skipped waves or unpaused timers. | NOT_RUN |
| Q08 | Per-frame reviewed units and effects at target scale; no clipping, cross-cell sheet fragments, invisible warnings or contradictory art/UI states. | NOT_RUN |
| Q09 | Gesture unlock, audible mix, mixer/mute persistence, bounded voices, pause/resume, repeated retry and inaudible loop joins; record audible browser check separately from file decode. | NOT_RUN |
| Q10 | Lose and regain L2 water route through scheduled fault; reroute legally while blocked, then demonstrate alternate lane economy and correct raincoat/mender behavior. | NOT_RUN |
| Q11 | Play L3 both boss phases, dodge a telegraphed lock and observe one completed lock. Kill boss yet win only later if other enemies remain. Verify separate fault/lock state, L3 victory and boss breach defeat. | NOT_RUN |
| Q12 | Fresh save opens L1 only. Finish L1→L2→L3 via normal Next buttons, reload after each win, replay earlier level, preserve already earned records and verify ending. | NOT_RUN |
| Q13 | Corrupt/unknown save, storage disabled, fastest-time and star improvements independently, repeated result event and locked level access by normal controls. | NOT_RUN |
| Q14 | Run each level at normal speed. Record one no-breach clear route for each, a distinct alternate L1 opening, completion times, one failed route and reason. Check first-run 25–30 min target and tune only with evidence. Record human unaided run separately. | NOT_RUN |
| Q15 | Benchmark budget at heavy L3, cold title and repeated restart on stated environment. Verify no memory/resource growth, downgrade effects at reduced motion and retain timing signals. | NOT_RUN |
| Q16 | Production-assembled candidate tested using trusted preflight with temporary catalog, proper subpath, no leaked private catalog entry, source files, debug controls or concept media in runtime. Preserve canonical catalog. | NOT_RUN |
| Q17 | Once authorized, verify actual live published SHA, catalog and direct route, enter/play/return from public URL, and exhibit rollback target and prior routes. Record Producer G4 and live identifiers. | BLOCKED |

## Sân Mưa candidate

- Runtime candidate [`5b34762f240f93e8b1b4892fd116430d9e7e3dea`](https://github.com/huynhngocsonuit2000github/ai-game-studio/commit/5b34762f240f93e8b1b4892fd116430d9e7e3dea). Draft [PR #35](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/35). The runtime build contains 32 files, totaling 1,344,085 bytes before HTTP compression. The standalone playtest ZIP came to 1,251,672 bytes in local packaging.
- Node 24.22.3, pnpm 11.25.0, Playwright 1.65.1 and Debian Chromium 156.0.8078.79. Desktop 1280×720, Chromium touch emulation 844×390 and portrait rotation 390×844. Production files served over HTTP in the real project subpath. The six authored waves have no random seed. Browser play used actual card, tile and valve inputs and the ordinary 30 Hz simulation at normal speed.
- Visual evidence and both complete normal-speed routes are from the exact runtime candidate above. The input recordings repeated the original routes after the compact forecast and delayed-audio repairs. [Desktop wave 3](screenshots/s03-raincourt-desktop.webp) · [Touch wave 3](screenshots/s03-raincourt-touch.webp) · [Defeat](screenshots/s03-raincourt-defeat.webp).

| Check | Result | Observed evidence |
| --- | --- | --- |
| Q01 | PASS | Frozen install, locked TypeScript build, direct and temporary catalog entry, play via the assembled project subpath, relative library return and zero browser errors in the targeted suite. |
| Q02 | PASS | Unit checks for occupied, invalid, enemy-covered, unaffordable and locked placements. Touch planted and removed an outer tile, with stock 150 → 105 → 116. |
| Q03 | PASS | Unit checks confirmed baseline interval and +18 wet / +10 dry collector payouts. Browser pause held the same countdown. |
| Q04 S03 | PASS | A reroute during cooldown left only one lane wet. Unit checks covered dry damage, wet geometry, four-target ceiling and skipping shock-immune raincoats. Pump closures are Q10. |
| Q05 | PASS | Roots, reduced frontal damage against Chậu Giáp, fern impact timing, single kill reward, impact-before-breach and immediate lethal loss passed simulation checks. Both browser routes cleared all six waves with no breach. |
| Q06 | PASS | Desktop keyboard selection, arrow traversal and Enter placement. Compact touch placement, removal, both outer valves and ≥44 px valve controls. The forecast clears the board. Portrait rotate hint, focus and reduced-motion settings checked. Physical devices and assistive technology are pending. |
| Q07 | PASS | No-defense route lost after the third breach, then retry restored 150 Ánh Hạt, three core HP, a dry board and preparation. Explicit pause tested. Visibility change also exercised by synthetic browser event. Real tab switching awaits device playtest. |
| Q08 | PASS | Reviewed the supplied sprites in motion at desktop and compact sizes. Iterated on forecast placement to clear the top aisle and preserve the bottom valve. Captures show active wave, health/stock/wet status, physical projectiles and a lane entrance warning. |
| Q09 technical | PASS | A strict-autoplay check found that the initial HTMLAudio implementation could suppress delayed clips. Replaced it with gesture-unlocked Web Audio. Rain, watch music and an Orchid shock advanced on the running audio clock. Pause suspended the context and the mute toggle zeroed master gain. Both exact-candidate runs exercised the attack, warning, reroute and victory sources with zero browser errors, and the loss route exercised breach and defeat. Human listening and loop continuity are NOT_RUN. |
| Q12–Q13 S03 slice | PASS | Reload returned to campaign and retained the winning record. Audio and motion toggles persisted. Later stage unlocks and full save hardening are S04. |
| Q14 S03 | PASS | Collector-first desktop and two-Fern-first touch routes cleared at normal speed. No-defense route was a reproducible loss. See timings below. First-run campaign duration and unaided play are pending. |
| Q16 S03 | PASS | Trusted catalog preflight exited 0 on the exact runtime candidate. All 36 browser checks passed across the temporary assembled site and its games. The canonical release manifest excluded this game. The playable ZIP excludes source sheets, concept art and designed S04 content. |
| Q10–Q11, Q12–Q16 campaign | NOT_RUN | Blocked by the S04–S05 dependency on Producer G2; both later arenas are designed and scoped. |
| Q17 | BLOCKED | Pages publication and G4 are separate Producer decisions. |

### Normal-speed routes

Actions and timings are in [playtest.mjs](../tests/playtest.mjs). Combat times exclude the 20-second preparation and use the simulation clock on the result screen.

| Route | Opening | Outcome |
| --- | --- | --- |
| Collector first | Put Bình Hứng and Dương Xỉ in luống 2, water that lane, defend luống 3 and add Lan Sét to luống 2 once funded. | 7:09.867 combat, 3/3 Hạt Tim, two stars, best chain two. |
| Two Ferns first | Start Dương Xỉ in luống 2 and 3, build collectors in luống 4, then add Gai Cuộn and route water to Lan Sét in luống 2 when targets bunch. | 7:13.400 combat, 3/3 Hạt Tim, three stars, best chain three. |
| No defense | Let enemies through with no plants and retry from the result dialog. | Defeat after three breaches. Retry starts a fresh attempt. |

The shipped Sân Mưa waves and plant values match the approved tuning. The runs confirm two materially different openings and an observable trade between wet income and an Orchid combo. Once both collectors and several Ferns are established, players can retain a large stock reserve in the final waves. Producer feedback should assess whether those waves need more decisions before scaling.

### Reproduce

- From the repository root, run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `python3 -B -m unittest discover -s scripts/tests -p 'test_game_pack.py'`.
- Build and run the focused unit suite with `pnpm --filter @studio/midnight-greenhouse typecheck` and `pnpm --filter @studio/midnight-greenhouse test`.
- Run `STUDIO_PAGES_BASE_SHA=$(git rev-parse origin/main) node scripts/catalog-preflight.mjs` from the committed candidate. Set `STUDIO_CHROMIUM_PATH` only when using a system Chromium.
- For the long game-local run, serve the built game on the project subpath, set `GREENHOUSE_PLAYTEST_URL` to its entry and run `node games/midnight-greenhouse/tests/playtest.mjs`. This runner sends regular browser inputs and takes about eight minutes. See the [standalone launch and Producer checklist](../README.md#s03-playtest).

## Three-level candidate

GH-D05 expressly deferred the Producer G2 playtest for GH-THREE-LEVELS. See [PR #35](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/35) for the exact tested head, full normal-speed browser results, hosted check outcomes and artifact link. The approved tuning and three authored schedules are retained.

| Checks | Evidence |
| --- | --- |
| Q01–Q09 | Five production-layout Playwright tests passed, including direct and catalog entry, return, keyboard and touch input, pause and strict-autoplay audio. Existing S03 behavior is also covered by simulation regressions. |
| Q10 | Unit tests cover authored warnings, forced flow cut, preserved cooldown, blocked reroutes, reopening, healing selection, shock immunity, Moss recovery and the full Hầm Bơm route. The normal-speed browser runner checks the live warning, cutoff, closed-lane rejection and restored route. |
| Q11 | Tests cover the two boss phases, Bramble slowdown, overlapping lock sources, pump preservation after boss death, completed lock, dodge, post-boss cleanup, Pod timing and lethal boss breach. The browser route checks the fixed warning target, successful dodge, later forced flow cut and phase-two HUD. |
| Q12–Q14 | The production browser runner starts with a fresh profile, plays via the ordinary seed/valve/tile controls, uses Next, reloads earned unlocks and checks victory, defeat, retry and record persistence. Unit tests and seeded browser cases cover S03 saves, corrupt saves, denied writes, invalid gaps and independent best-time and star updates. |
| Q15 | Chromium 156, Linux, cold title and illustration decode completed in 1,308 ms under CDP at 10 Mbps / 100 ms. JS used heap after collection was 1,871,352 B after one attempt and 2,146,108 B after ten additional abandon/start cycles. This excludes decoded media and GPU memory. Cached arena reuse and four intentionally blocked Ogg requests left gameplay and controls usable. The exact-head PR records frame measurements from the 30-second boss interval. |
| Q16 | Canonical registry and publication remain separate. The trusted preflight assembles a temporary catalog, exercises the project subpath and builds the test-only standalone ZIP. The game runtime contains 40 files totaling 2,236,463 B before transfer compression. Source sheets, concept artwork and test code are outside the runtime. |
| Q17 | BLOCKED pending a separate Producer release decision and Studio registration. |

Physical phone and Firefox/Safari verification, assistive technology, an unaided human clear and subjective audio review remain pending. Frame samples are browser requestAnimationFrame intervals on Cloud Chromium and desktop touch emulation.

The normal-speed runs use a fresh Chromium context with no pacing override. Serve the build under the Pages project subpath, set `GREENHOUSE_PLAYTEST_URL` to the game entry and run:

```sh
node games/midnight-greenhouse/tests/playtest.mjs campaign
node games/midnight-greenhouse/tests/playtest.mjs dome-touch
```

The main run verifies end-to-end campaign progression. The separate touch replay starts Đài Chớp from a fixture with Sân Mưa and Hầm Bơm completed. [Exact input routes](../tests/campaign-routes.json)
