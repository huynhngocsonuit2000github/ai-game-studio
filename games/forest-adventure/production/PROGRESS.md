# Production checkpoint

- Target `forest-adventure`, pack 0.1.0. S00 is accepted at PR #10 candidate `ab9e6ccaea1e4de3434c6cdc7b7bfac55cf7a7fa`. S01-1 and S01-2 are `candidate_ready` for local G1 review. [Decisions D07 and D08](DECISIONS.md)
- Base `9b7ff0e9dd8e89b8d449587ed2cf197f303577ad` from `origin/main`. Candidate branch `prod/forest-adventure/s01`. Use the S01 PR head for the exact candidate SHA.
- Fernlight Trail is playable with a keyboard. The shipped L1 geometry and atlases power movement, enemies, collectible routes, the lantern and gate. S01 adds no regenerated media.
- The [QA report](../reports/QA_REPORT.md) records the Chromium clear, respawn and gate states, automated checks and screenshot locations. The build and screenshot bundle is under the ignored game `test-results/s01-evidence/` directory in the execution workspace.
- PR #11 merged into main at `3f7c3baa1afbafe13ec5e3930a84d103e802cfcd`. The Producer cleared the original S01 visual assets for the public development preview under D06. The Studio publishing PR supplies public catalog and Pages admission.
- S01 still awaits the Producer's playtest and explicit acceptance. S02 remains gated.
