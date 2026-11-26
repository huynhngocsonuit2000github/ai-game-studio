# Studio backlog
Execute one ready slice per task. All tasks initially pending except M0-01.

| ID | Depends on | Outcome / acceptance |
|---|---|---|
| M0-01 | none | Pinned Node/pnpm workspace, strict TS React portal, valid empty registry, lint/typecheck/unit/build and browser smoke pass; setup documented |
| M0-02 | M0-01 | Catalog and game detail routes; development fixture proves navigation to independent game and return; invalid IDs handled; no fake production entries |
| M0-03 | M0-02 | Docker preview with health check and rollback; run on available host or mark local test blocked; static subpath build verified |
| M0-04 | M0-03 | CI scope validation, test artifacts, full-site Pages assembly, deployment workflow and rollback; verify actual URL after authorized merge and Pages setup |
| M0-05 | M0-04 | Producer accepts foundation portal; document onboarding and isolation regression tests |
| M1-01 | M0-05 | Import separately approved Kitchen Chaos pack preserving original repo and behavior; verify relative assets and browser gameplay |
| M2-01 | M1-01 | Development dashboard reads per-game progress/QA metadata; no runner or AI execution claims |
| M3-01 | M0-05 | Onboard approved new 2D game pack; independent build, tests and catalog entry |

No real games or paid infrastructure are authorized by this backlog alone. M1 and M3 require explicit import/production approval.
