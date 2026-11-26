# Production checkpoint

- Forest Adventure, pack 0.1.0. S00 was accepted from PR #10. The Producer accepted the deployed S01 preview from PR #14 after playing it. [Decisions D07, D10 and D11](DECISIONS.md)
- S02 through S04 share the branch `prod/forest-adventure/s02-s04`, based on `fbb9e318b094562b92f42c466ecb1d50b0884d52`. The implementation PR head identifies the combined candidate.
- S02-1/2 integrated the art, camera, motion and feedback changes. The internal Fernlight keyboard clear, recovery, gate and restart checks ran before L2/L3 expansion. S03-1/2 added the mixer, settings and playback lifecycle. S04-1/2 added Willow Run, Lantern Oak, the finale, Continue and replay records.
- The three-trail candidate passed the automated Chromium campaign, including all 24 fireflies, and can be reviewed as one build. S02–S04 Producer acceptance is deferred to combined review. The outstanding listening, device and first-time playtest checks are recorded in the [QA report](../reports/QA_REPORT.md).
- The default Pages build uses only media cleared for S01 under D06. Campaign backgrounds, UI art and synthesized audio build only in the local campaign mode. The review build and gameplay captures stay in the workspace under `test-results/`.

## S05–S06 handoff · 2026-11-26

- Synced with main at `e8c20fb6ed114d8e2a25177ad967b4b5deb2ca4c` (PR #15). The branch `prod/forest-adventure/s05-s06` carries the combined candidate under D12. Use the implementation PR head to identify the revision.
- S05-1 polished the three-trail campaign. Changes cover visual hazard cues, terrain edges, Pip's poses, gate and recovery feedback, results navigation, and fades between music themes. S05-2 measured the candidate and ran the regression suite. The measured Cloud run met the numeric targets. Chrome and Edge passed the campaign tests. Target-laptop, full Firefox and Safari evidence are pending.
- S06-1 built the complete Studio Pages artifact at the project subpath and rebuilt the prior main for rollback comparison. Existing public entries and the S01 media clearance are preserved. The private campaign build uses the same catalog, game and return paths.
- S05 is ready for local review with open compatibility and playtest gates. S06 release is blocked. D06 covers the S01 development preview. Campaign rights, the trusted Studio registry and publication authorization, and Producer acceptance remain open. S06-2 can run against the published SHA only after authorized merge.
- Resume by running the private campaign Playwright command in the [QA report](../reports/QA_REPORT.md), then complete the open checks in [S05](../stages/S05/STAGE.md) and [S06](../stages/S06/STAGE.md). Keep the current draft open and the catalog status as In Development until the release requirements are met.

## Final S06 checkpoint · 2026-11-27

- Based on `95cdbb639594a0685490a16e3549589905c66375`, which merged PR #16. D13 records the Producer's campaign gameplay acceptance and conditional release direction. The exact Producer-tested build identity is unverified. The Pages smoke for this main revision passed against the S01 preview.
- S06-1 verified the first-party campaign sources and pinned notices. The default build selects the full campaign only when the canonical Studio entry is public and Released. Both the default S01 artifact and a local Released fixture passed Pages assembly. The canonical catalog still says In Development.
- S06-2 is blocked by the open validation in the [QA report](../reports/QA_REPORT.md). The representative laptop trace and five unaided playtests remain mandatory. Record their evidence or an explicit measured Producer exception where the stage permits one. The exact trusted scope grant and two registry fields then follow the [release notes](RELEASE_NOTES.md). Live campaign verification follows authorized manual merge.
