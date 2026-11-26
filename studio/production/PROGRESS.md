# Studio progress

## M0-02 — Catalog navigation

- Status: candidate_ready
- Baseline: `daaddfbae158fe2362ff718cf985f8d09ebbe98e`, the M0-01 PR head. Latest `main` (`2fe3d2a`) is its ancestor. Use the M0-01 PR branch as the review base while it is open.
- Scope: catalog and game detail routes, invalid ID handling, development-only fixture and return navigation.
- Baseline checks: setup, lint, typecheck, 29 unit tests, production build and two Chromium smoke cases passed.
- Tested candidate: `dab05ab202c9e63d6ebdcea0933b6b2c990b7e49`. Build output: `portal/dist/` with JS `index-DteRKj1o.js` and CSS `index-Ekb0i_C_.css`.
- Approval: M0-02 awaits explicit Producer approval. Next task after approval: M0-03 (Docker preview, health check, and rollback).
- Limitations: local verification on Linux with headless Chromium 156.0.8078.79. Hosted preview and deployment were NOT_RUN. Production catalog contains zero games.

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm setup` | PASS (0) | Frozen install with the writable store and system Chromium overrides below |
| `pnpm lint`, `pnpm typecheck`, `pnpm test` | PASS (0 each) | No lint or type errors, 29 unit tests passed |
| `pnpm test:browser` | PASS (0) | Production build and four Chromium tests passed, including production at `/studio/` and development at `/studio-dev/` |
| Production fixture exclusion | PASS (0) | No fixture directory or fixture title and entry markers in `portal/dist/`. Production registry remained empty. |
| Screenshot review | PASS | [Game detail](evidence/m0-02/detail.png), [independent fixture](evidence/m0-02/fixture.png), [unavailable game](evidence/m0-02/unavailable.png) |

The initial typecheck reported a collision with the browser global `status`; the fixture now uses its own feedback binding. A browser run also caught Chromium cancelling an obsolete favicon request during navigation. The test ignores this specific cancellation and still checks HTTP errors and other request failures.

```sh
export PNPM_CONFIG_STORE_DIR=/tmp/studio-pnpm-store
export STUDIO_CHROMIUM_PATH=/usr/bin/chromium
pnpm setup
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
test ! -e portal/dist/fixtures
! rg -l 'Navigation Fixture|fixtures/navigation' portal/dist
```

## M0-01 — Workspace and portal

- Target: studio
- Milestone: M0 Foundation
- Task: M0-01
- Status: accepted
- Baseline: `2fe3d2aa083e5617caacaa82590dc87806658423`. Verified the Foundation Pack, contracts, templates, and empty registry. Baseline application checks were NOT_RUN because the pack contained no application or check scripts.
- Tested candidate: `71cfab50a6bb5853bbe18df878062d1fd0ebc769`. This progress and evidence commit records the result.
- Scope: pinned Node 24.22.3 and pnpm 11.25.0, workspace and lockfile, strict React/TypeScript portal, build-time registry validation, local setup, and baseline checks. The original 32 × 32 portal favicon was created for this repository from a two-color pixel pattern.
- Approval: Producer explicitly approved M0-01 on 2026-11-26. The approved PR head is `daaddfbae158fe2362ff718cf985f8d09ebbe98e` and the tested build is recorded above. Foundation-wide acceptance is M0-05.
- Next ready task: M0-02, catalog and game detail routes, navigation and return using a development fixture, and handling invalid IDs.

## Verification

Ran on Linux with Node 24.22.3, pnpm 11.25.0, Playwright 1.65.1 and headless system Chromium 156.0.8078.79.

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm setup` with the environment below | PASS (0) | Frozen workspace install and executable check |
| `pnpm lint` | PASS (0) | ESLint with zero allowed warnings |
| `pnpm typecheck` | PASS (0) | Strict TypeScript check |
| `pnpm test` | PASS (0) | 29 registry unit tests |
| `pnpm build` | PASS (0) | Static output in `portal/dist/`. JS `index-obxglpgp.js`, CSS `index--u7tpLTS.css` |
| `pnpm test:browser` with the environment below | PASS (0) | Two viewport checks against the build at `http://127.0.0.1:4173/studio/`. No console or network failures. Screenshots inspected at [1440 × 900](evidence/m0-01/desktop.png) and [390 × 844](evidence/m0-01/mobile.png). |
| Stock Playwright Chromium download | BLOCKED (1) | Playwright CDN returned HTTP 403. The installed Chromium passed both smoke tests. |
| Hosted preview and deployment | NOT_RUN | Local smoke only. Docker and Pages are later backlog tasks. |

```sh
export PNPM_CONFIG_STORE_DIR=/tmp/studio-pnpm-store
export STUDIO_CHROMIUM_PATH=/usr/bin/chromium
pnpm setup
pnpm test:browser
```

The first browser run found a missing favicon request. The candidate ships the icon and passed the rerun with the console and network checks enabled. There are no known M0-01 acceptance blockers.
