# Forest Adventure 2D · Production Pack

Build target: single-player Phaser browser platformer. Repository location: games/forest-adventure/. Canonical ID: forest-adventure. Pack version 0.1.0. This directory contains production design, layout data, runtime art/audio, source masters, and the Codex Cloud handoff.

## Import

1. Approve the G0 design assumptions in [DECISIONS](production/DECISIONS.md) and the target folder. Extract the ZIP into a clean branch of the AI Game Studio repository, preserving games/forest-adventure/. Compare against current main and review [Studio integration](production/STUDIO_INTEGRATION.md).
2. Give the pack to Codex Cloud using [START_CODEX](START_CODEX.md). The repository's root AGENTS.md remains authoritative. Import/register under S00, then run one stage at a time.
3. Resume with **Continue production: forest-adventure** in the monorepo. **Continue production** is sufficient when this game is the explicit current target and its checkpoint is in context.
4. Producer testing starts with the S01 playable branch build. Preview commands and the remote artifact handoff are in [Studio integration](production/STUDIO_INTEGRATION.md).

| Need | Read |
| --- | --- |
| Game, level coordinates and balance | [GDD](design/GDD.md), [level design](design/LEVEL_DESIGN.md), [level data](design/LEVELS.json) |
| Art, audio and files | [Art direction](design/ART_DIRECTION.md), [audio](design/AUDIO_PLAN.md), [manifest](production/ASSET_MANIFEST.csv) |
| Implementation contracts | [Tech design](design/TECH_DESIGN.md), [Studio integration](production/STUDIO_INTEGRATION.md) |
| Current work and evidence | [Progress](production/PROGRESS.md), [stage queue](production/PRODUCTION_PLAN.md), [QA](reports/QA_REPORT.md) |

Use assets/runtime/ for import. assets/source/ holds paintings and provenance. Do not ship source art, reports or tools inside the runtime build. Generator source is in tools/ and is optional for consumers using the checked-in assets.
