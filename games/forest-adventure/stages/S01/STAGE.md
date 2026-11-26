# S01 — Playable L1 prototype

Dependency: S00 accepted; approved dependency lockfile and CI paths. Player outcome: play Fernlight Trail to a clear or defeat/retry. No L2/L3, new mechanics or release visibility.
- S01-1 Set up strict TypeScript/Phaser package and test scripts, input, fixed simulation, player movement, collision, two enemy loops and L1 geometry.
- S01-2 Add three seeds, eight fireflies, checkpoint, gate, hearts, pause/restart and results. Use actual atlases for character/enemies/terrain. Bootstrap preview and archive candidate build.
- Assets: pip.png, creatures.png, forest-props.png, terrain.png, soil-body.webp, bg-fernlight.webp and matching frame data. Audio/art polish follows in S02/S03.
- Acceptance: unit and browser tests Q01–Q08 pass for L1, all three seeds required, actual successful clear and deliberate respawn with persisted in-attempt seeds, no errors and return link under subpath. Execute one playthrough with a real mouse or keyboard.
- Preview: local portal or candidate artifact with SHA. Automatically create/update the S01 PR and stop at G1.
