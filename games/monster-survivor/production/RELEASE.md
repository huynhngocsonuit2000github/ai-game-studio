# G4 candidate and rollback

This game PR implements the first Normal release candidate. The public registry currently labels the deployed S03 game In Development. The scoped PR leaves that registry entry unchanged. Merging the game PR would update the already-public route through Studio’s existing Pages workflow, so keep it unmerged until explicit G4 release approval.

## Producer playtest

Download the PR’s `browser-evidence` artifact and extract the nested `monster-survivor-g4-preview.tar.gz`. The adjacent `tested-commit.txt` identifies the checkout built by the verification workflow. From the directory containing the extracted `ai-game-studio/` folder, run `python3 -m http.server 4177 --bind 127.0.0.1` and open `http://127.0.0.1:4177/ai-game-studio/`. Choose Monster Survivor in the library. The archive contains both games and the real catalog for return-flow testing.

For a source build, use the pinned Node/pnpm toolchain and the [Studio Pages runbook](../../../deployment/README.md). Run the assembled browser suites before playtesting. Keep the release benchmark results and any Producer feedback against the tested commit. [Normal QA](../reports/RELEASE_QA.md)

## Separate Studio registry proposal

After explicit release and Studio approval, update only Monster Survivor’s entry in `registry/games.json`.

| Field | Current | Proposed |
| --- | --- | --- |
| status | development | released |
| milestone | S03 · Polished vertical slice | S06 · First release |

Retain the public visibility, ID, entry, cover, and version `0.1.0` unless Studio formally approves a version change. The build works under both public statuses. Review which approved merge triggers the live update. Record the actual deployed SHA and live game playtest independently of the build check.

## Rollback plan

Use a reviewed fix-forward or revert after an authorized release if the Normal build fails. Restore Monster Survivor’s source to the approved S03 content at `ff54db362cc29e6e7f3796eaae04d695dbdd639c`. Preserve the current registry’s public route and both game IDs. If release metadata has already changed, coordinate a separate Studio registry rollback to In Development. Rebuild the complete artifact and verify both catalog launches, direct entries, return links, and permissions before manual merge.

After rollback deployment, verify the published build marker and release manifest, then play S03 and Forest Adventure. Preserve browser storage. Both versions use `ai-game-studio:monster-survivor:v1`. S03 reads the same records, cosmetics and controls. A write from S03 can drop the Normal-only optional graphics detail preference, which defaults safely when Normal returns. Forest Adventure storage is separate.

The last verified S03 deploy used the Pages workflow’s exact revision and HTTP checks. [S03 deploy verification](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45938886699)

## S06 verification record

- PASS on the working tree sampled for the scoped PR. Frozen installation, lint, both typechecks, 50 Studio tests, 12 trusted pack tests, 20 game tests, canonical Pages assembly, game state validation, and the relative asset verifier passed. The six Studio, eight Forest Adventure and one Monster Survivor browser cases passed on the assembled site. An initial Forest run caught an aborted backdrop request while leaving the game. The full retry passed with the same game and test files.
- PASS for preview packaging. The locally generated archive contains both public entries and extracted byte for byte against the assembled site. The hosted PR workflow supplies the commit-stamped download.
- PASS for rollback rehearsal. Rebuilt `ff54db3` in a detached worktree. Both catalog launches, direct entries and return links worked. The public manifest stayed byte-identical and Forest Adventure’s entire output matched the candidate. Forward and rollback reads of v1 storage passed.
- The supplied runtime media and rights remain as cleared in [MS-AP01](DECISIONS.md). G4 human playtest, physical-device and alternative-browser checks and live Normal verification remain open. No publication or registry mutation was performed.
