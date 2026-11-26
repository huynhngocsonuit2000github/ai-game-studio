# Production checkpoint

- Forest Adventure, pack 0.1.0. S00 was accepted from PR #10. The Producer accepted the deployed S01 preview from PR #14 after playing it. [Decisions D07, D10 and D11](DECISIONS.md)
- S02 through S04 share the branch `prod/forest-adventure/s02-s04`, based on `fbb9e318b094562b92f42c466ecb1d50b0884d52`. The implementation PR head identifies the combined candidate.
- S02-1/2 integrated the art, camera, motion and feedback changes. The internal Fernlight keyboard clear, recovery, gate and restart checks ran before L2/L3 expansion. S03-1/2 added the mixer, settings and playback lifecycle. S04-1/2 added Willow Run, Lantern Oak, the finale, Continue and replay records.
- The three-trail candidate passed the automated Chromium campaign, including all 24 fireflies, and can be reviewed as one build. S02–S04 Producer acceptance is deferred to combined review. The outstanding listening, device and first-time playtest checks are recorded in the [QA report](../reports/QA_REPORT.md).
- The default Pages build uses only media cleared for S01 under D06. Campaign backgrounds, UI art and synthesized audio build only in the local campaign mode. The review build and gameplay captures stay in the workspace under `test-results/`.
