# Production plan

Execute batch `GH-THREE-LEVELS` through one scoped candidate PR. Use `PROGRESS.md` as checkpoint, `BACKLOG.md` for tasks, `DECISIONS.md` for approvals, and `reports/QA_REPORT.md` for evidence. Honor the external prompt and root contract on required reviews. Each stage is verified individually before dependents. Review, registered visibility and live release are separate decisions. Scope is additive and game-local: all content under `games/midnight-greenhouse/**`; never edit sibling games or shared workflows to get a pass. Exact new-file scope in the external JSON guards extraction; game-local implementation files are authorized by the prompt after validating the import.

| Stage | What must be playable or reviewable | Completion gate |
| --- | --- | --- |
| S00 | Trusted baseline, validated clean game import, audited art/audio and content data. | Record G0 Producer concept and 3-stage scope decision. |
| S01 | Sân Mưa win/loss/retry at intended speed via normal controls. | G1 internal evidence. |
| S02 | Finishing-quality board, motion, readable HUD, tutorial, and keyboard/touch. | Screenshots and QA on intended viewports. |
| S03 | One polished, tuned L1 with final original audio and help. | Technical G2 check, then Producer review unless explicitly deferred for this batch. |
| S04 | All three levels playable with distinct lane threats, unlocks, save persistence, settings and boss ending. | Full campaign and failure path. |
| S05 | Complete technical candidate and measured quality, including temporary Pages catalog preflight. | G3 internally, G4-ready candidate only. |
| S06 | Separate approved publication work and live smoke after manual merge. | G4 approval, trusted scope and actual deployment receipt. |

Hold candidate scope at 3 stages, 6 plants, 5 ordinary enemy types and 1 boss. Skip optional cosmetic variants if they endanger readability or performance. Do not cut combat, access controls, save, or evidence silently. Pass a stage only on measured results. If a stage fails, fix the actual failure within scope, rerun affected checks with at most three identical failure retries, and stop dependent work upon a real blocker. Preserve one game-owned checkpoint.
