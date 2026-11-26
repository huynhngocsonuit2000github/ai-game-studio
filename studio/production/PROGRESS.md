# Studio progress

## M0-03 — GitHub Actions and GitHub Pages

- Status: candidate_ready for the recovery PR. Live acceptance remains blocked until the public site returns HTTP 200 with the expected commit.
- Recovery: PR #3 merged into `studio/m0-02-catalog` at `2406516`. Current main `8a91e16` lacks `pages.yml`, so that merge did not trigger a main deployment. The recovery PR targets main directly and adds a manual deployment trigger restricted to current main. Pages source is reported as GitHub Actions. Recovery checks passed workflow lint, build, lint, typecheck, 29 unit tests, four Chromium tests under the project subpath, and artifact validation. The workspace HTTP client and Cloud browser were blocked by the network proxy before receiving an origin response.
- Baseline: M0-02 PR #2 head `e1ca3c3530ca53ea8260b8f7b80c14586c5931b9`. Fetched current main `8a91e16107f498ccf124d059c5e17e26db83f69f` and verified its tree matches the M0-01 base of M0-02. Use the M0-02 branch as the review base while PR #2 remains open.
- Tested candidate: `883bec2487b37afe0c7e747e8950358d40c3c876`.
- Scope: GitHub Pages workflow, project-subpath tests, portal artifact validation, and hosting, onboarding and acceptance standards. Docker is optional.
- Approval: M0-03 awaits live verification and explicit Producer approval. Next task after acceptance: M0-04, changed-path scope validation, full-site assembly and rollback verification.

| Check | Result | Evidence |
| --- | --- | --- |
| `actionlint` 1.7.12 | PASS (0) | Workflow lint passed |
| `pnpm setup`, `pnpm lint`, `pnpm typecheck`, `pnpm test` | PASS (0 each) | Frozen install and 29 unit tests |
| `STUDIO_PAGES_BASE_PATH=/ai-game-studio/ pnpm test:browser` | PASS (0) | Production build and four local Chromium tests. Inspected [mobile screenshot](evidence/m0-03/pages-subpath.png). |
| `pnpm verify:pages` | PASS (0) | Output index and three site-relative assets verified. In temporary copies, nonempty registry, fixture directory and root-relative asset each failed with the expected diagnostic. |
| Hosted deployment and published commit check | NOT_RUN | Requires GitHub Pages source configuration and authorized merge into main. The platform response did not allow reading Pages settings from this workspace. |

Local checks used Linux, Node 24.22.3, pnpm 11.25.0, and Chromium 156.0.8078.79 at `/usr/bin/chromium` via `STUDIO_CHROMIUM_PATH`. Set `PNPM_CONFIG_STORE_DIR` to a writable directory in restricted environments. See the [deployment runbook](../../deployment/README.md) for setup and live verification.

## M0-02 — Catalog navigation

- Status: accepted
- Baseline: `daaddfbae158fe2362ff718cf985f8d09ebbe98e`, the M0-01 PR head. Latest `main` (`2fe3d2a`) is its ancestor. Use the M0-01 PR branch as the review base while it is open.
- Scope: catalog and game detail routes, invalid ID handling, development-only fixture and return navigation.
- Baseline checks: setup, lint, typecheck, 29 unit tests, production build and two Chromium smoke cases passed.
- Tested candidate: `dab05ab202c9e63d6ebdcea0933b6b2c990b7e49`. Build output: `portal/dist/` with JS `index-DteRKj1o.js` and CSS `index-Ekb0i_C_.css`.
- Approval: Producer explicitly approved M0-02 on 2026-11-26. Approved PR #2 head: `e1ca3c3530ca53ea8260b8f7b80c14586c5931b9`. Next task: M0-03, GitHub Actions and GitHub Pages.
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
