# Studio backlog
Execute one ready slice per task. See the production checkpoint for milestone status.

| ID | Depends on | Outcome / acceptance |
|---|---|---|
| M0-01 | none | Pinned Node/pnpm workspace, strict TS React portal, valid empty registry, lint/typecheck/unit/build and browser smoke pass; setup documented |
| M0-02 | M0-01 | Catalog and game detail routes; development fixture proves navigation to independent game and return; invalid IDs handled; no fake production entries |
| M0-03 | M0-02 | GitHub Pages workflow builds and tests PRs under the project subpath, retains browser evidence, and deploys the verified portal artifact only from pushes to main. Candidate gate verifies the workflow and static artifact. After authorized merge and Pages setup, the workflow checks the published URL and commit. |
| M0-04 | M0-03 | CI changed-path scope validation, full-site Pages assembly that preserves published games, and rollback drill. Verify the deployed URL and commit from M0-03 after authorized merge. |
| M0-05 | M0-04 | Verify the latest Pages deployment and all Foundation gates. Document independent game onboarding and prove the published-game path with isolated browser regression. Producer accepts the Foundation before any game production. |
| M1-00 | M0-05 | Premium Game Library Dashboard. Accept against the dashboard criteria below. |
| M1-01 | M1-00 | Import separately approved Kitchen Chaos pack preserving original repo and behavior; verify a Pages project-subpath build, relative assets, portal return and browser gameplay |
| M2-01 | M1-01 | Development dashboard reads per-game progress/QA metadata; no runner or AI execution claims |
| M3-01 | M0-05 | Onboard approved new 2D game pack; independent Pages-compatible build, subpath browser tests and catalog entry |

No real games or paid infrastructure are authorized by this backlog alone. M1 and M3 require explicit import/production approval.


## M1-00 acceptance criteria

- The static portal has a responsive dark layout, a featured game when an eligible build exists, and responsive cards using registry cover art. An empty production catalog shows Studio branding and an explicit empty state.
- Keyword, category and 2D/3D filters work together, with a result count, a distinct no-matches state and a reset control.
- Existing hash links, invalid-ID handling, browser history, release launch and the return to the library work under the Pages project subpath.
- Public releases are labeled Released. The local development catalog labels candidates In Development and offers a preview only when an entry is declared. A game without a declared build has no Play action.
- The canonical registry is the source of game and editorial metadata. Legacy registry entries remain valid and public assembly excludes unpublished content and metadata. Synthetic games remain test-only.
- Lint, typecheck, registry and pipeline regressions, production assembly, and desktop/mobile Chromium smoke pass. Screenshots show the empty and populated layouts. Approval is required at the PR boundary.
