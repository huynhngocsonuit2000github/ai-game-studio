# GH-RETRO-01 v2 · Technical QA

The tested site uses the canonical public catalog at the `/ai-game-studio/` project subpath. The approved baseline was `e25dbe3c78a4ef45105bb444e9c55fc088f079f6`. Normal-speed campaign and touch play used the runtime tested in the `c294f59` checkpoint. Benchmarks and hosted verification used `4f68611`. The final changes add a blocked Raincoat cue, its targeted check, the playtest harness fix for token-covered points, and evidence. They preserve campaign tuning and damage outcomes. [Feature brief](../design/retro/FEATURE.md)

## Campaign and balance

A fresh browser profile opened the real game through the public catalog, played with normal browser actions at the 30 Hz game rate, and advanced through both Continue controls. The ending opened, all three new records survived reload, and the portal return link resolved. No page exceptions, missing assets or runtime console errors were observed in the normal-speed campaign and four independent touch or loss runs. A no-defense run lost at 0:59 of combat. Retry restored 140 Ánh Hạt, 3/3 Hạt Tim and the bell. [Defeat and retry](screenshots/retro-defeat.webp)

| Run | Combat | Wall time including prep | Hạt Tim | Stars | Ending stock | Bell |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Sân Mưa, Bình Hứng + Fern | 4:26 | 273.0 s | 3/3 | 3 | 40 | Available |
| Sân Mưa, two Ferns, touch emulation | 4:26 | 272.5 s | 3/3 | 3 | 91 | Available |
| Hầm Bơm, campaign | 4:40 | 286.2 s | 3/3 | 3 | 163 | Available |
| Đài Chớp, campaign | 5:23 | 330.8 s | 3/3 | 2 | 152 | Available |
| Hầm Bơm, touch emulation | 4:40 | 286.2 s | 3/3 | 3 | 163 | Available |
| Đài Chớp, touch emulation | 5:23 | 329.6 s | 3/3 | 2 | 212 | Available |

The seed initially exhausted the bell on early test routes. Fern damage increased from 24 to 28. The 2.1 s attack cycle includes the windup, and Ferns account for in-flight damage when acquiring a target. The authored wave schedule, income values and three-Pitcher cap remain in effect. Desktop and touch browser clears both hit the two-target dry Orchid chain. The economy-first build added Bramble in lane 4 and additional Ferns in lanes 2 and 3 for the late rush. The two-Fern build added Orchid in lane 4 for clustered pressure and Orchid in lane 1 alongside more physical defense. Deterministic replays show 9,535 applied damage for each L1 clear, with 346/356 Fern launches, 38/9 Bramble hits and 3/12 Orchid attacks respectively. Ending stock in the exact simulation was 40 and 21. Stopping reinforcement at 1:45 of attempt time spent the bell and lost in both simulations, at combat 3:42 and 3:51. Browser action timing changes remaining stock and late planting opportunities. Both scripted clears still relied heavily on Fern, so the relative appeal of the other builds remains a Producer playtest question. [Runtime route data](../tests/retro-routes.json)

No quiet span with neither a live enemy nor a threat within six seconds exceeded ten seconds in the four deterministic routes. The longest scheduled spawn gaps were 10.0 s, 9.7 s and 8.4 s. Hầm Bơm chained to three targets, avoided the first threatened wet lane and completed normal pump closures. An isolated wet Moss and Orchid scenario exercises regeneration, four-target wet chain and immunity. Đài Chớp showed both Keeper phases, routed away from the phase-one warning, let the phase-two lock complete, and cleared ordinary enemies after Keeper fell. The reproducible Dome route holds back extra Ferns in the boss lane until after the lock and uses one Pod. [Simulation and pacing checks](../tests/simulation.test.mjs)

## Screens and motion

| Scene | 1280×720 desktop | 844×390 Chromium touch |
| --- | --- | --- |
| Sân Mưa | [Active wave](screenshots/retro-raincourt-desktop.webp) | [Late mixed wave](screenshots/retro-raincourt-touch.webp) |
| Hầm Bơm | [Pressure and water](screenshots/retro-pump-desktop.webp) | [Mixed wave](screenshots/retro-pump-touch.webp) |
| Đài Chớp | [Phase one](screenshots/retro-dome-phase-one.webp) · [Phase two](screenshots/retro-dome-desktop.webp) | [Phase two and lock](screenshots/retro-dome-touch.webp) |

[Desktop guide](screenshots/retro-guide.webp) · [Portrait guide](screenshots/retro-guide-portrait.webp) · [Ending](screenshots/retro-ending.webp) · [Win](screenshots/retro-win.webp) · [Map after reload](screenshots/retro-map.webp)

Browser tests exercised search with `ao mua`, Cây/Quái/Kỹ năng navigation, Porter counters, the Keeper spoiler toggle, a chosen animation, return focus and frozen stock/timers. They inspected a 390 px portrait guide and a paused 844×390 route. The guide requested only one atlas sheet for the selected preview. Both heights and widths of the outer L1 touch tiles exceeded 44 CSS pixels. Readable role/price details and the current battle status are exposed by DOM labels. [Playwright checks](../tests/pages.spec.ts)

Chrome's Canvas draw observer recorded multiple atlas columns for gait, bite, hurt and fall for all six enemies. It recorded Pitcher gather/release, Fern windup/fire, Bramble windup/lash, Orchid charge/spark, Moss brace/hurt/mend, Pod arm/burst and Keeper signal/phase. The same source-frame matrix is built from actual battle draws. Unit tests bind Garden transitions and reduced key poses to attack, real recipients, root/stun, immunity and one-shot fall records. Pillow decoded all 12 WebP sheets and 390 documented cells, including 13 deliberately transparent terminal cells after falls or burst. FFmpeg decoded all six supplied Oggs. [Canvas observer](../tests/motion-observer.mjs) · [Motion source](../src/motion.ts)

Short screen recordings use the actual game canvas at normal capture speed. The Sân Mưa reel shows first Fern shots and the Walker exit, then a late Orchid sequence. The Hầm Bơm reel shows Porter and Nấm Vá during the early attack and a later mixed field. The Đài Chớp reel shows both warnings, the completed lock, Pod and Keeper retreat. The late Dome clip uses accelerated preparation followed by real-time gameplay. The isolated pump encounter shows all six Raincoat insulation cells and all six wet Moss regeneration cells in the actual game. [Sân Mưa motion](motion/raincourt.mp4) · [Hầm Bơm motion](motion/pump.mp4) · [Đài Chớp motion](motion/dome.mp4) · [Insulation and regeneration](motion/insulation-and-regen.mp4)

## Build and delivery

The assembled game contains 4.12 MB on disk. Its full Sân Mưa run fetched 2.17 MB of distinct encoded resource bodies. A cold title requested no atlas, board or guide JSON. Its resource bytes were approximately 171 kB with repeated cover access counted once. Atlas metadata, guide identifiers/cross-links, stable campaign IDs, spawn schedule and fault windows are validated at build time. Runtime packaging excludes source sheets, concepts, design, QA recordings and tools.

Chromium 156 on the Cloud Debian host sampled the actual requestAnimationFrame intervals over two 30-second windows starting at Keeper arrival. Setup actions were advanced separately before the measured interval. The benchmark recorded desktop median/p95 of 16.7/16.8 ms over 1,733 intervals, and touch-emulation median/p95 of 16.7/16.7 ms over 1,786 intervals. Peak sampled JavaScript heap at the end of the two samples was 4.60 MB. A separate time-controlled test used the ordinary Retry button ten times after defeat. After garbage collection, heap was 1.79 MB before and 2.37 MB after. DOM nodes were 272/285 and event listener counts were 224/227. In a separate 390 px portrait guide run, ten cycles after the first preview kept 310 DOM nodes and 41 event listeners. The guide data and selected atlas each made one request across all cycles.

| Case | Result | Evidence |
| --- | --- | --- |
| GH-R01 | PASS | One-click Sân Mưa, six-second prep, combat second four spawn, normal-speed fresh campaign, defeat and retry. |
| GH-R02 | PASS | Token pointer, S, auto/manual tie, cap, no invalid debit, pause and reset. |
| GH-R03 | PASS | Two normal-speed Sân Mưa clears, late reinforcement actions and cutoff failure replays. |
| GH-R04 | PASS | Staged Orchid reveal, dry/wet attacks, pump outage and Moss, both Keeper lock outcomes and post-boss cleanup. |
| GH-R05 | PASS | Actual per-stage desktop/touch captures, 4×8 input mapping, tile sizes, keyboard placement and disabled reason. |
| GH-R06 | PASS | Valid, partial and corrupt legacy data, denied writes, separate repeat scores, rollback reads, bell ordering and bypass. |
| GH-R07 | PASS | Frozen install, type checks, lint, trusted scope, canonical Pages assembly and asset checks, catalog/return, PR workflow. |
| GH-R08 | NOT_RUN | Manual merge and candidate deployment pending. Independent baseline marker request returned a Cloud proxy 403. |
| GH-R09 | PASS | Vietnamese guide browse/filter/search, spoiler, pose preview, focus restoration and retained pause. |
| GH-R10 | PASS | Motion clips, actual state/cell observations, reduced motion selection and discard-safe fall records. |
| GH-R11 | PASS | On-demand decode, first-stage transfer, 30 s heavy scene samples, repeat Retry, atlas/media verification. |

Local repo checks passed 35 portal/registry unit tests, 15 Studio Node tests, 12 pack-validator tests, 15 game tests, 10 portal browser tests, 8 Forest Adventure browser tests, 9 Monster Survivor browser tests and 8 Midnight Greenhouse browser tests. The sibling game checks cover the unchanged canonical Pages build. [Hosted Pages workflow for the verified runtime](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/46106828364)

## Release checklist

1. Download and play the standalone campaign from the PR's browser-evidence artifact. Check the tutorial, late tactical choices, motion and sound on the Producer's hardware.
2. Manually merge the approved PR. After Pages deploys, compare `build-sha.txt` to the actual merged SHA, check the canonical catalog and direct route, and complete GH-R08.
3. Record Producer playtest and G4 separately. Physical Android/iOS, Firefox, Safari, assistive technology and subjective audio mix remain unverified. If rollback is needed, revert the scoped PR, rebuild the canonical catalog and check the retained public route.

[Expected development preview URL](https://huynhngocsonuit2000github.github.io/ai-game-studio/games/midnight-greenhouse/index.html)
