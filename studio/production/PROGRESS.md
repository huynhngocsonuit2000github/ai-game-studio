# Studio progress

- Target: studio
- Milestone: M0 Foundation
- Task: M0-01
- Status: candidate_ready
- Baseline: `2fe3d2aa083e5617caacaa82590dc87806658423`. Verified the Foundation Pack, contracts, templates, and empty registry. Baseline application checks were NOT_RUN because the pack contained no application or check scripts.
- Tested candidate: `71cfab50a6bb5853bbe18df878062d1fd0ebc769`. This progress and evidence commit records the result.
- Scope: pinned Node 24.22.3 and pnpm 11.25.0, workspace and lockfile, strict React/TypeScript portal, build-time registry validation, local setup, and baseline checks. The original 32 × 32 portal favicon was created for this repository from a two-color pixel pattern.
- Approval: none recorded. Producer foundation acceptance is M0-05.
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
