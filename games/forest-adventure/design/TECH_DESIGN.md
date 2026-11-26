# Technical design

## Platform and runtime

Use the current Studio Node and pnpm pins. Observed main uses Node 24.22.3 and pnpm 11.25.0. Match the root TypeScript/Vite toolchain and use a locked stable Phaser version approved during S00/S01; no engine upgrade in game-only stages. Game is an independent private workspace package @studio/forest-adventure. Vite base is relative, static build emits dist/, no backend or services. Maintain [Studio integration](../production/STUDIO_INTEGRATION.md) as the contract for integration.

| Owner | State and API |
| --- | --- |
| Bootstrap / Preload | Resolve assets from module-relative or game-relative URLs, browser format detection for audio, retry failed mandatory image/data load via one explicit action. Optional audio decode failure leaves visual cues intact. |
| Game session | Play state (Playing, Paused, Recovering, Cleared), seed/firefly sets, hearts, timer, checkpoint and attempt stats. Mutations happen on deterministic fixed ticks with stable entity IDs. |
| Input bridge | Track held and edge actions, normalize keys, ignore repeat events for menu and jumps, release inputs on blur, disable game capture while DOM controls are focused. |
| Simulation | Phaser scene with explicit 1/60 s input/game tick and Arcade Physics configured for fixed steps. Keep one step owner. If custom stepping is required, disable automatic stepping before claiming single-owner. Cap wall-clock delta at 100 ms, max 5 catch-up steps and drop backlog on resume. |
| Collision | World solids, player, enemies, hazards, pickups, checkpoints and portal are independent layers. Resolve world contacts then stomps, pickups, hazard/contact damage, finish once. Hurt sets invulnerability and locks steering briefly. Use previous feet plus downward velocity for stomp, stable entity order for competing effects. |
| Scene / entities | Boot → Menu → Play → Results. Pause/recovery are Play substates. On shutdown remove key, resize, audio and global event listeners, clear pool and pending timers. Reset shares immutable level definition. |
| Rendering | Sprite atlas JSON frames with custom pivots, 2× bitmap scale for world art unless referenced asset scale differs. Terrain collision layout uses LEVELS.json, not alpha. Camera clamps to level bounds with ~96 px lead, eased horizontal follow and damped vertical movement. Preserve 16:9 safe area on resize, center with letterboxing. |
| UI | DOM title, pause, settings, results and error overlay. HUD consumes a read-only UI snapshot. Use keyboard focus trap in pause/settings, return focus on close. Explain controls if portrait viewport is too narrow. |
| Audio | Audio banks declared by cues.json. Unlock via first Play key/button. No extra network dependency. State mixer listens to semantic events and enforces voice budget. |
| Save | Namespaced JSON document, defensive parse, atomic setItem, monotonic best records. Storage failure keeps in-memory session and surfaces a discrete message. No attempt-local data serialized. |

## Data and rules

Level asset loads are read-only. Assert unique IDs, positive in-bounds rectangles, three seeds, eight optional fireflies and valid checkpoint/finish. Complete user inputs and timed consequences under a tick clock. Collision groups are bit-identifiable. Publish events seedCollected, healthChanged, lanternLit, gateOpened, levelCleared, attemptReset. Cache terminal clear so serializing twice is harmless. Save key forest-adventure:save:v1 with schemaVersion, unlockedLevelIds, bestByLevel, and settings {master,music,sfx,muted,reducedMotion}. Reject nonfinite values, clamp 0–1 volumes, discard unknown level IDs and ignore malformed/future-schema payloads without throwing. Back to Studio link ../../#/ from the game entry. Deep-link load must work.

## Targets and measurements

Desktop Chrome/Edge and Firefox current supported Studio versions, Safari desktop current as a playback compatibility check. 1366×768 laptop class with integrated GPU at DPR 1 and 1920×1080 at DPR 2 cap. Responsive keyboard experience down to 960×540; narrow screens get visible landscape/keyboard support messaging. CI headless Chromium exercises functionality; representative device owns release numbers.

| Metric | Budget |
| --- | --- |
| Cold usable menu | ≤3 s on 10 Mbps / 100 ms RTT; capture using DevTools throttling |
| Initial transferred bytes | ≤6 MB compressed; defer L2/L3 and unused audio fallback |
| Total static runtime | ≤18 MB; exclude sources and evidence |
| Frame time | p95 ≤20 ms across 2 min L1 at target laptop, 60 Hz display |
| Memory | JS heap ≤120 MiB after repeated loads when measurable; decoded image budget ≤96 MiB estimated w×h×4 for concurrently resident textures |
| Regression | Zero page errors, unhandled rejections, missing required requests or duplicate listeners after 10 restarts |

Use deterministic fixtures and an injected tick clock for tests. Hard-code no remote CDN URLs. Production logs omit PII. Record browser/OS/DPR/build SHA, route and metrics in stage evidence. [QA matrix](../reports/QA_REPORT.md) assigns each flow and expected behavior.
