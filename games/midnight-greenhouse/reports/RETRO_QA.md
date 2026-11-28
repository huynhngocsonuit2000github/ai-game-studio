# GH-RETRO-01 v2 · Technical QA

Candidate checks use the canonical public Pages assembly under `/ai-game-studio/`. The baseline was `e25dbe3c78a4ef45105bb444e9c55fc088f079f6`. The [feature brief](../design/retro/FEATURE.md) describes the accepted scope and rollback target.

## Campaign and balance

The first staged browser checkpoint entered Sân Mưa through one click from an empty save. The initial stage has six seconds of preparation and a walker in lane 2 at 0:04 of combat. A normal-speed no-defense run reached defeat at 0:59 of combat. Retry restored 140 Ánh Hạt, 3/3 Hạt Tim and the available bell.

The authoring seed originally led to economy and defense routes depleting the bell during the early waves in the implemented simulation. Fern damage was tuned from 24 to 28, the windup was included in the authored cycle, and Ferns account for in-flight damage when picking their next target. The tuned game keeps the authored spawn schedule and the proposed token values and cap. The [engine checks](../tests/simulation.test.mjs) cover pressure, all four routes, bell order, Pod contact, locks, Moss regeneration, hit immunity, and pause-compatible pose selection. [Route data](../tests/retro-routes.json)

## Screens and motion

The atlas manifest is validated at build time against all twelve unit IDs, row and column bounds, tick timing and anchors. The browser guide and stage share lazy image decode. The test harness can observe actual Canvas source cells for both clips and frame changes. Static, reducer and live browser evidence are reported separately.

## Build and delivery

An isolated checkout at the inspected baseline passed the frozen install with pnpm 11.25.0. The canonical assembly loaded the public game from the actual registry and verified its required site-relative entry and cover. Browser and packaging evidence is tracked against the tested candidate.

GH-R08 awaits the Producer's manual merge. The expected public route is [Midnight Greenhouse on GitHub Pages](https://huynhngocsonuit2000github.github.io/ai-game-studio/games/midnight-greenhouse/index.html). The Cloud proxy blocked the independent baseline HTTP fetch with 403. Physical devices, Firefox/Safari, assistive technology and Producer audio/playtest remain separate from local Chromium automation.
