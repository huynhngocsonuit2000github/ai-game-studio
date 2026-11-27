# Import checklist — V5.2

- Sync current main and [reconcile the pack baseline, approved scope and deviations](../standards/CONTEXT_V5_2.md).
- Resolve the exact Producer-approved game ID and kind. Read the [handoff contract](../standards/WORKFLOW_V5_1.md) and the existing game checkpoint where applicable.
- Confirm readable ZIP bytes and independently approved digest, destinations, replacements, stage batch, rights and public-repository scope. For unavailable bytes, use the manual transfer fallback and record the blocker.
- Validate into scratch space. Inspect before/after, license provenance and the intended first task. Copy only reviewed files and inspect the actual Git diff. Record missing assets without substituting final placeholders.
- For a new game, fill the game template with real design, stage tasks, evidence criteria and suitable budgets. Keep the game isolated and send any initial registry/lockfile changes through [Studio scope review](../../.github/workflows/README.md). Register development visibility and use a null entry until a verified build exists.
- For an existing game, use the [feature brief](FEATURE.md) as applicable and preserve save compatibility, accepted stages and published routes. Use rollback and regression evidence for the changed behavior.
- Test the independent production build and the assembled Pages project subpath, including direct entry, portal launch/return, relative runtime assets and representative gameplay.
- Persist provenance and evidence, create or update the scoped PR, and record gate and publication decisions separately. Require Producer G0 design and G4 release approval.
