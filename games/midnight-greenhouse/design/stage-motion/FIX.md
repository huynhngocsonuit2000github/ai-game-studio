# GH-STAGE-MOTION-01 · Battlefield size and playable animation

Verified GitHub main and live Pages build marker at f854b0055ed66c5a53e9cf100a1cf58d97f7cfce. PR #37 is merged and main Pages workflow 46120538522 succeeded. The public title, Sân Mưa entry and planting on row 2 were observed. The desktop wrapper measured 1,190 CSS px and the board 979×526 at a 1363×936 viewport. The Producer's Đài Chớp image shows the same fixed footprint on a wider display. Source has 1300px and 1190px caps and a fixed canvas backing. Atlas playback was suppressed in reduced motion. Asynchronous loads could also leave early gameplay on still frames while the stage starts. The Producer asked to preserve the current character designs and show visible behavior in actual gameplay. The actual motion setting and asset availability in the Producer's browser are unknown.

## Included source

- Size the actual battle from the available width and height. Keep the menus, Sổ tay and portrait layout usable. Enlarge card images. Keep the board, pointer, anchors and HUD hitboxes aligned.
- Offer native fullscreen with a user gesture, state from fullscreenchange and a readable fallback. Reuse the same simulation and view on transitions. [Fullscreen API guide](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide).
- Decode stage atlases before showing the battle. Fit the canvas at bounded DPR and keep sprites proportionate on wide displays. Preserve current pose assets. Increase legible step, attack, impact and death motion from existing simulation data. Keep essential atlas poses in reduced motion. Show the armed Pod preparing before the actual gameplay blast.
- Add focused browser regressions for 1920×1080 geometry, fullscreen, state retention and actual Fern atlas draws. Update the Pod unit expectation to distinguish preparation from detonation.

## Candidate acceptance

1. Verify strict TypeScript, lint, repo and assembled Pages tests. Test desktop 1280×720, 1920×1080 and 2560×1440 at 100% zoom as well as 844×390 touch and portrait. At 1920×1080 require a visible board at least 1480×850 CSS px. Check all row/column edge hits and no horizontal overflow, resize, fullscreen enter/exit and real Esc. Test the unsupported fullscreen fallback separately.
2. Capture a short clip from the actual running game canvas, including Fern idle/windup/fire, enemy gait/bite/impact/fall, Mũ Tím run, Nấm Vá heal and Keeper warning/second phase. Capture the Pod arming and actual blast where feasible. Check semantic reduced-motion poses and pause behavior. Verify loaded atlas URLs via the real Pages subpath. Treat the guide as secondary evidence. Show before/after board size at 1920×1080.
3. Preserve all progression, saves, settings, controls and guide. Play all three levels through normal entry. Verify resize and restore in a real active round, check frame times on a late wave, and document devices and limits. Use one scoped PR, game-owned reports and a playable artifact. After authorized manual merge verify the Pages SHA, entry and in-game action separately.

## Current verification

Current tuning and existing approved art plus source were checked in a scratch build using Node's TypeScript transform. All 15 game simulation tests passed after the updated Pod visual-state assertion. Full compiler, browser regressions, performance and deployed changes still require candidate CI and review.
