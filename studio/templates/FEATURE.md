# Feature or expansion brief — V5.2

- Exact game ID and feature ID
- Kind and delivery format, including pack ID and archive SHA-256 where used
- Baseline commit, game version and save schema version
- Producer authorization, in-scope paths, exclusions and asset rights/publication evidence
- Player-visible outcome, dependencies and observable acceptance criteria
- Save compatibility, including an existing-save check and any approved migration
- Regression coverage for the touched loop, controls and target browsers
- Rollback through a scoped revert, including prior save readability, or an approved recovery plan
- Requested stages, review deferrals, and any gate approvals tied to the exact design or build
- Candidate commit, test results, known defects, next task and PR link

Use a prompt with these relevant details for small features with existing assets. Use a reviewed delta pack for complex or new-asset work. Link the brief from the existing game checkpoint and preserve its accepted stages and earlier evidence. See the [V5.1 handoff](../standards/WORKFLOW_V5_1.md).

Follow [context sync](../standards/CONTEXT_V5_2.md) and record current main SHA, approved scope, deviations and the tested revision (PR/CI metadata). Cite the saved QA in the game state when adopted.

| Approved requirement ID | Expected behavior | Actual implementation | Tested target, test and evidence | Result | Deviations |
| --- | --- | --- | --- | --- | --- |
| F-000.1 | Player-observable outcome | Source or artifact behavior | Revision, assembled Pages route, test or artifact link | NOT_RUN | Reason or none |

Use PASS, FAIL, NOT_RUN or BLOCKED. For level expansions, cover normal progression, next-level controls, save/reload and existing-save compatibility or migration, final victory, and runtime asset loads. Record private fixtures separately from canonical public artifact runs.
