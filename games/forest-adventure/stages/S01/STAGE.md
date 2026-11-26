# S01 — Playable L1 prototype

Dependency: S00 accepted; approved dependency lockfile and CI paths. Player outcome: play Fernlight Trail to a clear or defeat/retry. No L2/L3, new mechanics or release visibility.
- S01-1 Set up strict TypeScript/Phaser package and test scripts, input, fixed simulation, player movement, collision, two enemy loops and L1 geometry.
- S01-2 Add three seeds, eight fireflies, checkpoint, gate, hearts, pause/restart and results. Use actual atlases for character/enemies/terrain. Bootstrap preview and archive candidate build.
- Assets: pip.png, creatures.png, forest-props.png, terrain.png, soil-body.webp, bg-fernlight.webp and matching frame data. Audio/art polish follows in S02/S03.
- Acceptance: unit and browser tests Q01–Q08 pass for L1, all three seeds required, actual successful clear and deliberate respawn with persisted in-attempt seeds, no errors and return link under subpath. Execute one playthrough with a real mouse or keyboard.
- Preview: local portal or candidate artifact with SHA. Automatically create/update the S01 PR and stop at G1.

## Result · 2026-11-26

| Task | Status | Evidence |
| --- | --- | --- |
| S01-1 | PASS | Pinned Phaser 3.90.0, strict TypeScript, 60 Hz single-owner kinematic simulation, L1 terrain and enemy loops. [QA report](../../reports/QA_REPORT.md) |
| S01-2 | PASS | Three required Heartseeds, eight fireflies, lantern recovery, pause, restart, clear results and Studio navigation. A keyboard run cleared the trail after backtracking from the locked gate and deliberately respawning at the lantern. [QA report](../../reports/QA_REPORT.md) |

The local G1 candidate is ready for review. The S01 PR provides the exact candidate SHA. Public preview requires verified rights and Studio publication approval. The trusted scope checker requires the reviewed exact-head exception for this PR's catalog, lockfile and CI build-order changes. [Checkpoint](../../production/PROGRESS.md)
