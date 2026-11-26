# Production checkpoint

- Target `forest-adventure`, pack 0.1.0. S00-1 and S00-2 are `candidate_ready` for Producer review, 2026-11-26.
- Base and asset revision `4bfdb37c79b921ea63efdcdaf1e3c9e1185aeeaf` from `origin/main`. PR #9 already imported the pack. Candidate branch `prod/forest-adventure/s00`. Use the PR head for the exact candidate SHA.
- G0 scope approval recorded in [D03](DECISIONS.md). Initial release is Fernlight Trail, Willow Run and Lantern Oak. S00 candidate acceptance and D06 public redistribution approval are pending.
- C01–C03 supplied the design, source masters, runtime exports and offline evidence. S00 reused all supplied media. The checked-in manifest hashes, sizes and source paths match all 58 runtime files (5,585,284 bytes). See the [QA report](../reports/QA_REPORT.md) for commands, versions and results.
- The Studio parser accepts the development draft with null entry and cover. Live catalog registration requires a separately reviewed Studio registry change. The shared lockfile, Phaser version and candidate CI route are [documented](STUDIO_INTEGRATION.md).
- [Static art targets](../assets/concept/README.md) are the S00 preview. S01 is the first playable stage.
- Next action is Producer review of the S00 PR. Before starting S01, confirm S00 acceptance and get the Studio approvals documented above. S01 work has not started.
