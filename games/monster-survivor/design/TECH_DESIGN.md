# Technical design

## Runtime and boundaries

Use the Studio-pinned Node/pnpm toolchain and root Vite/TypeScript/Playwright with strict game-local tsconfig. First-choice renderer is Canvas 2D, `engine: "other"`, with no new package dependency. The game needs circles, swept bodies, atlas draws and a DOM overlay. It does not need an engine or renderer dependency. Keep each runtime entirely within `games/monster-survivor/`. `pnpm --dir games/monster-survivor run build` builds fresh static `dist/`. Respect Vite `base: './'`; import runtime WebP and PNG/WAV URLs through Vite or copy whitelisted assets into build output. Emit `dist/cover.webp` from the 16:9 library card. Repo-only sources, concept board and developer hooks stay out of the static output.

| Layer | Contract |
| --- | --- |
| `src/sim/` | Pure step, seeded state, geometry, skill effects, wave, pickups, boss, queue. No DOM/import-time browser state. |
| `src/content/` | Typed validation/adapters for `design/data/*.json`; fail on missing IDs, frame names, invalid caps, recipe dependencies or overlapping wave bands. |
| `src/render/` | Canvas art/camera, cached ground canvas or repeated tile, shared shadow bitmap, visible-only Y sorted entities and props. VFX consume events, never change combat. |
| `src/ui/` | HUD, interactions, modals, accessible settings, recap and field guide. Display state is a projection of simulation, with focus and local view state. |
| `src/platform/` | Input snapshot, RAF time adapter, save, audio, resource loader, lifecycle and entry. Dispose listeners, voices, timers and pools on unmount. |

One simulation owns effective statuses and timing. Fixed step 1/60 s, clamp a rendered frame to 0.1 s, run max 5 steps per frame and discard excess wall time. Interpolate only moving visuals between snapshots. Use deterministic seeded PRNG streams for director, drafts, AI and cosmetics. IDs increase per run. Store deadlines as integer ticks derived once from seconds; use inclusive bounds from GDD. Do not consume RNG for rendering. Update order: input, movement/wall resolution, scheduled spawns and AI/telegraphs, automatic attacks, hit/death/status/effects, pickups/rite deltas, outcome/queue, emit and flush. Apply pending removal once. Reuse slot arrays and never add entities while iterating active arrays directly. Hostile projectiles and dashes use swept circle movement. No hit detection based on rendered pixels. One collision grid indexed by 72–96 px cells with local neighbor queries. Use one bounded scratch list per query and stable-ID tie breaks. Starfall scores at most 24 target candidates.

`loading → title → running ↔ modal or paused → result → title/running`. Pause stores its return state if opening over a reward modal. Freeze all simulation state and countdowns in reward modal, settings, focus loss and pause. Clamp browser input to one accepted transition intent per UI event. Clear held keys/pointer on blur, visibility hide or pointercancel. Use explicit Resume. Cancel/restart only after confirming a live run, and replace all run state and queues atomically. When coming back from a hidden tab, reset accumulator. Art and nonessential audio fallback display retryable error or muted play where applicable. A missing required atlas halts load with actionable feedback.

## Asset and input contracts

Atlas JSON pixel coordinates use `{x,y,w,h,pivot,displayMaxPx}`. Keep actual draw rectangle ratio; position using normalized pivot. Use Canvas drawImage source rectangles. The base frame is the original drawn asset. Animation uses authored motion described in Art Direction, rather than changing body physics. Require keyboard + touch landscape. Pull pointer capture on joystick and forget it on cancel; keep dash pointer independent. Canvas fitting uses safe area, responsive HUD and letterbox. Desktop base 960 × 540 logical view. Mobile can expose a 16:9 letterbox inside the wide available region without distorting world or collision.

`AudioContext` with master, music and SFX buses. Persist volume/mute and all settings separately from gameplay. Load music on interaction using same-app relative URLs. Save just at settings update or completed run. No progress mutation on boot.

## Persistence v1

Key `ai-game-studio:monster-survivor:v1`. Store `schemaVersion`, `settings` (volumes 0–1, mute, reducedMotion, contrast, damageNumbers), `lifetime` (runs, wins, bestClearMs or null, longestMs, recordKills), `discoveredSkillIds`, `cosmetics` (unlocked and selected), and last 20 finalized `runIds` for idempotent writes. All queries use validated defaults. Clamp ranges, migrate only known old versions, replace corrupt v1 after showing once-per-session persistence status. Unknown future version stays untouched and game runs with nonpersistent defaults. Attempt one storage write per finalized run record, merge latest read by completed unique ID before write. Single active gameplay tab is supported; intra-tab idempotency is required. Storage failure remains recoverable and is surfaced in Settings. Do not touch any sibling storage key.

## Performance budgets (targets awaiting game measurement)

| Metric | Desktop target | Mobile mid-tier target |
| --- | --- | --- |
| Scenario | 1366×768 Chromium on Intel i5-1135G7-class integrated graphics | Android Chrome on Snapdragon 778G class physical device at 360×800 rotated |
| Core game first playable transfer | ≤3 MiB cold, title art + atlases, minus lazy assets | Same |
| Total shipped runtime | ≤9 MiB including all audio and optional art, archive sources excluded | Same |
| Input-ready | ≤4 s on 10 Mbps / 150 ms RTT from navigation | ≤6 s same shaping |
| Dense 90 s combat | Median fps ≥58, p95 frame ≤23 ms | Median fps ≥30, p95 frame ≤40 ms |
| Bounded resources | ≤80 MiB game JS heap and ≤24 MiB decoded textures; ≤10 MiB heap drift after three clean retries | Same budgets; report metric support |
| Canvas | DPR ≤2 and canvas pixel cap 2.1M; low quality reduces to 1.25 DPR and halves cosmetic particle count | DPR ≤1.5 and ≤1.2M pixels, allow quality toggle |

Enemy and projectile caps from rules are release defaults. Bound pooled animations and damage numbers (30 active, coalesce per target/time bucket). Guard voice count and no per-entity gradients or canvas full-surface filters. Drop decorative effects before combat entities. No production debug hooks. Capture true elapsed frame timings under the heaviest normal and boss phases on real hardware when available; missing physical device evidence is NOT_RUN, separate from Playwright device emulation.
