# Decisions

| ID | Design / proposal | Status |
| --- | --- | --- |
| MS-D01 | Bellgrave Garden, Wick, 2/3 rites Normal, 16 skills, one end boss, small cosmetic progression | G0 approved under MS-AP01 |
| MS-D02 | Independent TypeScript and Canvas 2D, current Studio tooling, no new services; touch landscape and keyboard | Approved design; implemented for the slice |
| MS-D03 | S00–S03 Vertical Slice, S01/S02 reviews deferred in the external handoff, G2 stop | Authorized under MS-AP01 |
| MS-D04 | Original supplied media approved for public repo via exact import grant; public Pages visibility separate | Repository media approved under MS-AP01; Pages pending |
| MS-D05 | Integration is a game-only PR under current scope; prepare separate registry registration for Studio review | Reconciled with Studio V5.2; registry separate |

## MS-AP01 — Producer external handoff prompt

Recorded 2026-11-27. The Producer approved G0, each exact payload destination in `monster-survivor-production-v1`, zero replacements, and committing the supplied `assets/**` to the public repository. The authorized ZIP SHA-256 is `af497a784662693c39d2bd4e726d1903db1e67ee1f72aa421761f68da7968696`.

The Producer authorized the named MS Vertical Slice S00–S03, with the S01 and S02 Producer reviews deferred for this batch. G2 review, registry changes and Pages publication remain separate. S04 starts only after G2 approval. Merge is manual.

Intake matched `f46ee26e4c0402dcd3d9c84504380af27c48e644`. Studio V5.2 landed during verification. Latest inspected main `c790f520f96f6702fc2014f1c1524d2b01f341fa` was a descendant, with no destination, registry, lockfile or save contract conflict. The same ZIP and external approval validated on a clean V5.2 baseline. All 38 committed asset blobs match the staged receipt.
