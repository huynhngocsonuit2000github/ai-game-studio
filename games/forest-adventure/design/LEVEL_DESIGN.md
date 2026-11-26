# Level design and balancing

960×540 logical viewport, 32 px grid. Level JSON positions increase downward. Solids and hazards are [x, topY, width, height]. Lantern, spawn and goal are bottom-center anchors. Beetle y is its foot position, moth y is center. Seeds and fireflies use centers. Main ground y=432 and kill line y=544. Full-solid collision for elevated ledges. Sprite logical size 96 px, body 32×54.

| Knob | Starting value | Tuning window |
| --- | --- | --- |
| Run max / accel / braking | 250 px/s / 2000 / 2400 px/s² | Max 235–265 |
| Air acceleration | 1650 px/s² | 1400–1800 |
| Gravity / held launch / tap clamp | 1400 px/s² / −510 px/s / −265 px/s | Held apex 88–99 px, tap 22–30 px |
| Coyote / buffer | 100 / 120 ms | 80–120 / 100–140 ms |
| Max fall / stomp bounce | 720 / −365 px/s | Bounce apex ~48 px |
| Damage lock / knock | 900 ms / 180 horizontal, −220 vertical px/s | 750–1050 ms lock |
| Respawn delay | 650 ms | 500–750 ms |
| Beetle speed / turn | 60 px/s / 180 ms | 52–75 px/s |
| Moth travel / cycle | ±48 x, ±20 y / 3.2 s | 2.8–3.6 s |
| Checkpoint safe distance | ≥160 px ahead to first main hazard, ≥64 px behind to an edge | Keep walkable at respawn |

A held jump lasts ~0.73 s at equal height (182 px at full run). Mandatory rises cap at 48 px. Mandatory gaps cap at 128 px. Model combined rise/gap and require 20 px travel margin, then validate by input in the real browser. Maintain visible takeoff and landing edges. Optional routes trade timing for fireflies with no gate dependency. Put seed pickup hitboxes within reach at y≈395–405 on main paths.

## L1 — Fernlight Trail (2688 px, S01–S03)

1. x=0–448 safe runway, first fireflies and a 48 px step.
2. x=448–1088 first 96 px gap, safe landing, isolated beetle and Seed 1 at x=944. Player can avoid or stomp.
3. x=1088–1664 second 96 px gap, high optional branch, quiet lantern and Seed 2 at x=1504. Full recovery before first hazard.
4. x=1664–2368 bramble, then a 128 px gap with readable edges and a moth well beyond the landing. Seed 3 at x=2192.
5. x=2368–2688 calm finish. Gate animates, shows missing seeds if closed and lets the player backtrack. Results if open.

## L2 — Willow Run (3712 px, S04)

Safe stairs and a beetle; two short gaps introduce a narrower rhythm. Seed 1 at x=1248. Lantern at x=1600. Isolate a bramble and then a beetle patrol. Seed 2 at x=1940. A moth crosses one elevated bonus path, while the safe lower route continues to Seed 3 at x=2976. Close on a floodbank with enough room to see the gate.

## L3 — Lantern Oak (4192 px, S04)

Alternate ledges to teach height without stacking hazards; Seed 1 at x=1488. Lantern at x=1952. Separate the bramble, long gap and moth with safe flat ground. Seed 2 at x=2816. Use stairs and optional high fireflies for the final climb. Seed 3 at x=3696 then a wide finishing platform. Restored oak lighting is the final reveal. No boss.

## Playtest and adjustment

Collect anonymous local result counters and written feedback. At G2, aim for four of five first-time players to clear L1 without coaching and to explain seed lock/checkpoint. Target median 3–5 minutes and no mandatory segment killing four participants more than twice each. Adjust foreground markings, camera or landing position before the global jump curve. Record device, build, run times, deaths by segment, missed seeds and the Producer decision. These values are design targets until playtested.
