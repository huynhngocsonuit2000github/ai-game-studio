# S05 — Compatibility and performance

Dependency: S04 accepted. Player outcome: consistently usable browser release candidate.
- S05-1 Run asset decodes, full campaign, storage and input regression on target browser matrix; verify loop codecs and pause/restart state. Tune memory or first load if required.
- S05-2 Capture traces and budgets on real target laptop, fix regressions, close P0/P1s and evaluate licensed release assets.
- Assets: runtime manifest, requested replacement assets and candidate evidence.
- Acceptance: Q01–Q16, targets in TECH_DESIGN.md or explicit measured Producer exceptions. Verify no unapproved placeholder and no P0/P1. G3 requires test evidence and scope coverage.
- Preview: exact candidate artifact and rollback rehearsal notes. Automatically create/update one PR and stop.

## Combined S05–S06 result

S05-1 completed the campaign polish under D12 and exercised the progression, defeat recovery, victory, restart and save flows. The pack specifies lantern or trailhead recovery with no lives limit. Gameplay scenarios cover all three trails, their existing geometry and eight optional fireflies per trail.

S05-2 passed the Cloud Chromium budgets and produced three-trail captures. The Chrome and Edge campaign suites passed. Full Firefox and Safari coverage, audible loop seams, target laptop measurements and unaided first-time playtests are open. See the [QA report](../../reports/QA_REPORT.md) for the candidate evidence and open checks.
