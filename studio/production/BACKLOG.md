# Studio backlog
Execute one ready slice per task. All tasks initially pending except M0-01.

| ID | Depends on | Outcome / acceptance |
|---|---|---|
| M0-01 | none | Pinned Node/pnpm workspace, strict TS React portal, valid empty registry, lint/typecheck/unit/build and browser smoke pass; setup documented |
| M0-02 | M0-01 | Catalog and game detail routes; development fixture proves navigation to independent game and return; invalid IDs handled; no fake production entries |
| M0-03 | M0-02 | GitHub Pages workflow builds and tests PRs under the project subpath, retains browser evidence, and deploys the verified portal artifact only from pushes to main. Candidate gate verifies the workflow and static artifact. After authorized merge and Pages setup, the workflow checks the published URL and commit. |
| M0-04 | M0-03 | CI changed-path scope validation, full-site Pages assembly that preserves published games, and rollback drill. Verify the deployed URL and commit from M0-03 after authorized merge. |
| M0-05 | M0-04 | Producer accepts foundation portal; document onboarding and isolation regression tests |
| M1-01 | M0-05 | Import separately approved Kitchen Chaos pack preserving original repo and behavior; verify a Pages project-subpath build, relative assets, portal return and browser gameplay |
| M2-01 | M1-01 | Development dashboard reads per-game progress/QA metadata; no runner or AI execution claims |
| M3-01 | M0-05 | Onboard approved new 2D game pack; independent Pages-compatible build, subpath browser tests and catalog entry |

No real games or paid infrastructure are authorized by this backlog alone. M1 and M3 require explicit import/production approval.
