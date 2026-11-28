# GH-RETRO-01 · Original retro garden refresh

- Approved scope in GH-D06. Replay and refresh the three existing campaign stages under the same public development catalog entry.
- Baseline `e25dbe3c78a4ef45105bb444e9c55fc088f079f6`. The pack authoring inputs and its static QA are in this directory. Canonical play values are in [TUNING.json](../TUNING.json). [Legacy tuning](LEGACY_TUNING.json) records the previous campaign.
- Save compatibility. An earned contiguous legacy win can still grant stage access. New records use `midnight-greenhouse.retro.progress.v1`. The settings key and legacy record bytes survive a rollback.
- Rollback. Revert the scoped PR if the refresh needs withdrawal. The prior runtime at the baseline already packages the same public route and cover path. Rebuild, verify the canonical catalog and check the deployed marker after manual merge of a rollback.

| Requirement | Expected player behavior | Implementation and evidence |
| --- | --- | --- |
| GH-R01 | One-click Sân Mưa, six-second prep, first group at combat 0:04, all three stages and a recoverable defeat. | Direct stage entry with normal Continue and Retry. See normal-speed runs in the [QA report](../../reports/RETRO_QA.md#campaign-and-balance). |
| GH-R02 | Manual and automatic tokens are credited exactly once, with no input or resource collision. | Tick-ordered drop queue, shared keyboard/pointer command boundary and capped Pitchers. Simulation and Pages browser suites. |
| GH-R03 | Both an economy-first and double-Fern opening can clear. Late mixed pressure rewards reinforcements. | Separate deterministic routes and late reinforcement controls with recorded balance outcomes. [QA report](../../reports/RETRO_QA.md#campaign-and-balance) |
| GH-R04 | The campaign introduces the Orchid reveal, water, Moss and both Keeper phases at the intended stages. | Dry and wet arcs, timed faults, Keeper warning and closure, and final cleanup. The simulation and assembled-browser evidence distinguish the stages. |
| GH-R05 | Original readable board and controls at desktop and touch sizes. | Calibrated 4×8 grid, directional focus, cast cues and responsive notebook. [QA report](../../reports/RETRO_QA.md#screens-and-motion) |
| GH-R06 | Legacy wins/settings survive, new scores stay separate, and the bell is spent at most once per attempt. | Versioned records, contiguous unlocks, ordered breaches, pause and retry tests. |
| GH-R07 | Public Pages artifact launches and returns at the project subpath with complete runtime assets. | Canonical assembly, frozen install, runtime/browser tests and trusted path classifier. [QA report](../../reports/RETRO_QA.md#build-and-delivery) |
| GH-R08 | Inspect the deployed SHA, canonical public route and normal live gameplay after Producer merge. | Pending merge and live observation. |
| GH-R09 | Browse a standalone Vietnamese guide before play and from pause. Filter, search, see counters and choose optional motions. | Compiled localized content, canonical numeric badges, hash navigation, spoiler opt-in and frozen battle. |
| GH-R10 | Atlas poses follow actual combat states with separate reduced-motion behavior and bounded deaths. | Shared atlas cache, state-resolved poses and actual hit/effect layers. [QA report](../../reports/RETRO_QA.md#screens-and-motion) |
| GH-R11 | Only needed runtime media loads, with responsive guide, heavy combat and repeat starts. | Relative asset build, lazy decode, manifest validation and measured Chromium evidence. [QA report](../../reports/RETRO_QA.md#build-and-delivery) |
