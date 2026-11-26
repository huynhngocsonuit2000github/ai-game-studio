# S00 — Design lock and import

Dependency: Producer approval of exact folder, scope D03 and G0 pack. Player outcome: a clean handoff for a game with agreed mechanics. Scope excludes runtime/gameplay implementation.
- S00-1 Validate baseline branch, asset manifest, draft record and G0 approvals. Reconcile source provenance. Run asset verification and the Studio registry parser on the draft.
- S00-2 Import game files and negotiate any strictly needed root registry, trusted scope, S01 lockfile and candidate CI prerequisites. Keep entry/cover null. Capture pinned tools and allowed files in progress.
- Assets: every manifest ID at package level. Contract: validate primary sources, runtime archive and repository paths separately.
- Acceptance: exact base SHA, one authorized import folder, valid schema, official approval captured and S01 authorization route documented. Any required approval remains visible as a blocker.
- Preview: inspect the supplied noninteractive art target and art exports. S01 is the first playable stage.
- After checks, publish/update one authorized S00 PR and stop for acceptance.

## Result · 2026-11-26

| Task | Status | Evidence |
| --- | --- | --- |
| S00-1 | PASS | Verified the import base, the three-level G0 decision, all runtime hashes, asset source records and the draft registry record. [QA report](../../reports/QA_REPORT.md) |
| S00-2 | PASS | Found the existing import on main, verified the Studio checks, and documented the authorization route for catalog registration, Phaser, the shared lockfile and candidate CI. [Studio integration](../../production/STUDIO_INTEGRATION.md) |

S00 is `candidate_ready`. The candidate head appears on the S00 PR from `prod/forest-adventure/s00`. Producer acceptance is pending. Open prerequisites and the next authorized action are in the [checkpoint](../../production/PROGRESS.md).
