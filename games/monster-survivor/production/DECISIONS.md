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

## Monster Survivor First Release · Producer authorization

On 2026-11-27 the Producer accepted G2 for the live S03 In Development preview and authorized S04–S06 as one named batch. Separate S04 and S05 Producer reviews are deferred for this batch. Technical checks remain stage gates. Stop at the G4 candidate for explicit release approval and playtest. Keep merge manual and route any Released registry change through separate Studio approval.

The preview source is the S03 tree merged and registered at `ff54db3` in PR #25. GitHub reported a successful Pages workflow for that commit. The workspace live URL probe returned HTTP 403, so the exact commit marker from the Producer's play session remains unobserved here. [Registration PR](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/25) · [Pages run](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45938886699)

## MS-510 · Normal balance

Keep the authored spawn schedule, enemy HP bands, rites, recipe ranks and Warden HP. Taper the Normal-only ember value by wave time and give the Warden full vulnerability during recovery. Outside recovery the base damage multiplier is 0.25. The S03 release and save schema remain the rollback base. A graphics detail preference is optional in v1 and defaults to full detail for existing saves.

## Campaign v1 batch authorization

The Producer approved expansion design and the exact five additive payload files with zero replacements in pack `monster-survivor-campaign-v2`. The approved external request names MSC-10, MSC-20 and MSC-30 as one batch with intermediate reviews deferred. The candidate uses the game’s existing media grant and preview entry. Final acceptance and manual merge remain with the Producer. [Campaign brief](features/ms-campaign-v1/BRIEF.md) · [Campaign QA](../reports/CAMPAIGN_QA.md).

## Campaign Polish design and art grant

**MSCP-AP01 — Producer external handoff prompt** approves the Campaign Polish design and six exact additive payload files with zero replacements. It covers the four verified lantern portraits in the public repository and in the existing Pages preview after manual merge. The external request authorizes MSCP-10, MSCP-20 and MSCP-30 as one batch with intermediate Producer reviews deferred. Producer playtest and candidate acceptance remain pending. [Approved brief](features/ms-campaign-polish-1/BRIEF.md) · [Art rights](features/ms-campaign-polish-1/ASSET_RIGHTS.md).
