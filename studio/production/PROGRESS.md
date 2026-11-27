# Studio progress

## Studio V5.2 — Context-aware production

- Baseline `199fce3866c18d7b8267be10268ed9906079ca75` includes V5.1 (PR #18) and the Forest Adventure public campaign preview (PR #19). Approved scope is Studio infrastructure and one Forest Adventure production state file. The V5.1 pack format, independent approval, rights checks, delivery loop and manual merge remain in force.
- Version notes. Root instructions, standards and templates now require scoped main and deployment reconciliation. State v1 distinguishes merged source, normal public packaging, Producer acceptance and observed deployment. Feature briefs trace each approved requirement to its tested behavior. Pages CI checks adopted state, exercises public game browser suites and summarizes SHA/reachability evidence after deployment.
- Changed areas are root instructions and README, Studio standards/templates/checkpoint, Pages workflow/runbook, state validator and regression fixtures, and `games/forest-adventure/production/GAME_STATE.json`. The registry and gameplay tree have no runtime changes.

| Approved requirement | Expected result | Actual implementation and local evidence | Result | Deviations |
| --- | --- | --- | --- | --- |
| Request §1 and §6 | Sync existing-game work to main and preserve the pack and resume contracts | Context protocol and templates. All 12 pack fixture tests passed, including a stale ancestral replacement baseline. | PASS | Text upload was readable. Live ZIP attachment and import NOT_RUN. |
| Request §2 and §3 | Versioned, evidence-backed state with truthful publication and acceptance | State validator and eight fixtures. Forest Adventure has three authored and three playable levels in the canonical Pages artifact. D13 accepts campaign gameplay with exact build identity unknown. D14 authorizes the public preview. | PASS | Live state is unverified. Existing formal release gates apply. |
| Request §4 | Trace requirements and prove affected behavior on the normal public build | Updated feature brief and canonical assembly. Seven game browser cases passed, including fresh three-trail progression, Next Trail, v1 save/reload and older save compatibility, the finale, runtime assets and return to the library. Six Studio browser cases passed. | PASS | The campaign suite controls frame time with real keyboard input. |
| Request §5 | Record deployed revision, URL and results without changing deploy authority | Existing Pages workflow writes a SHA-linked summary of revision and HTTP checks. Workflow YAML and multiline shell syntax passed locally. | BLOCKED | Live marker and site requests hit a proxy 403. Live browser gameplay NOT_RUN. No post-merge evidence exists for this batch. |
| Acceptance | Preserve trusted base scope | Trusted checker and policy stay as on main. Seven existing Pages/scope regression fixtures passed. | BLOCKED | The unchanged trusted checker rejects the mixed Studio plus game-state batch unless main grants the exact candidate SHA and changed paths under the existing exception mechanism. |

Local verification also passed frozen installation, ESLint, Studio and Forest Adventure typechecks, 35 Vitest tests, 19 game unit/registry tests, normal production build and Pages assembly/verification, and the read-only asset validation (58 files, three layouts). Chromium evidence was generated under `test-results/` and the game's `test-results/pages-browser/`. See [Forest Adventure QA](../../games/forest-adventure/reports/QA_REPORT.md) for existing stage and rights evidence.

Resume from `studio/context-aware-production-v5-2` and its draft PR. Recover its exact candidate SHA and paths from the PR, reconcile with current main, and use the existing trusted scope process before review. Verify hosted checks when accessible. After any authorized manual merge, record the workflow's observed revision and run the public checklist against that SHA.

### Trusted scope follow-up

- Reconciled PR #20 with main at `e84935e4053fcc35ea7a8258559ce55a5e87f9bd` after PR #21 merged. The seeded state now records all 13 trails in the canonical preview, the expansion v1 save and migration, and pending Producer acceptance for the ten additions. The checks above describe the original three-trail baseline; the reconciled state cites the [expansion checkpoint](../../games/forest-adventure/features/exp-10-trails/CHECKPOINT.md).
- The Producer authorized the combined infrastructure and state diff. The existing scope workflow requires a policy-only companion PR containing an exact-head and exact-path grant. After the companion lands on main, use an edited event on PR #20 to trigger scope with the new trusted base while retaining its approved head. Check both SHAs in the job logs before merge.

## Studio V5.1 — Workflow upgrade

- Base: `ea96679a42732a3a260fa4d77b35c6a2ac8bd115`. Workflow-only scope covers exact-ID handoffs, pack validation, feature and import templates, autonomous delivery, and trusted scope regression. The game trees, canonical registry and published Pages route remain as recorded at the base. Forest Adventure is a public In Development preview.
- Use the [V5.1 handoff](../standards/WORKFLOW_V5_1.md) for new-game and delta ZIPs, prompt-only fixes and resume. The validator writes a private before/after review and provenance receipt. Apply only the reviewed diff after checking rights, approval and checkout state.
- Scope: standing edits to title, description and version apply only to the same planned or development entry that remains private on the trusted base and candidate. A stale private branch loses the standing grant if main makes the entry public. Public entries and other fields retain Studio review or the existing field grant. Mixed lockfile, workflow and shared changes still require a separate trusted exception. The S01 historical exception still passes for its original 23 paths.
- Attachment verification: the task supplied a readable text upload. ZIP attachment access and a live import were NOT_RUN. The local deterministic ZIP tests passed. Use the documented manual transfer fallback when attachment bytes are unavailable.
- Next: review the workflow PR and its checks. Human merge is required. This upgrade carries no game or playtest approvals.

| Local check | Result |
| --- | --- |
| Frozen setup, workflow lint, ESLint, portal and Forest Adventure typechecks | PASS |
| Portal, scope and Pages unit/regression tests | PASS (35 registry and 7 pipeline tests) |
| Forest Adventure unit tests | PASS (19) |
| ZIP fixture and validator tests | PASS (11) |
| Production builds, Pages assembly and artifact verification | PASS. The release manifest resolves `games/forest-adventure/index.html` at version `0.1.0`. |
| Chromium project-subpath smoke | PASS (6). Covers the portal, public Forest Adventure preview, local game and synthetic onboarding. |
| Chromium Forest Adventure S01 | PASS (2). Covers catalog launch/return, direct entry, keyboard play, pause, resize and restart. |
| Chromium Forest Adventure private campaign | PASS (7). Covers the same routes plus saved progress, audio and asset recovery in the local-only build. |

Local runs used pinned Node and pnpm and system Chromium 156.0.8078.79. Live deployment is outside this PR and follows verified main after a human merge.

The first hosted Pages check caught a wait on the public-preview cover selector while the catalog still showed the featured and result images. The smoke test now waits for the game detail view and checks its cover. [Initial hosted run](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45907678208)

## M1-00 — Premium Game Library Dashboard

- Status: candidate_ready. Producer review pending at the milestone boundary.
- Main baseline: `25eefb4` (Foundation sign-off merged). Tested dashboard: `276b17d0d20fd1a75550205f9980f6b07f1869d7`.
- Scope: responsive dark library, featured selection, card covers, search, category and 2D/3D filters, release and development states, game detail and launch, and a local preview for built milestones.
- Registry: `registry/games.json` stays canonical and empty. Optional display metadata is backward-compatible. Public builds include released entries, and development candidates and test fixtures are excluded from the production bundle and artifact.
- Next: Producer approval of M1-00. Game import requires separate approval of the pack and target.

| Check | Result | Evidence |
| --- | --- | --- |
| Baseline | PASS (0) | Frozen setup, lint, strict typecheck, 35 automated tests, build, static assembly and five Chromium tests on main. |
| Candidate workflow lint, lint, typecheck and automated tests | PASS (0 each) | 35 registry tests and six pipeline regressions. |
| Production build, assembly and artifact checks | PASS (0 each) | Pages artifact preserved the production catalog and static layout. Runtime hero WebP is 147.84 kB. |
| Chromium browser regression | PASS (0) | Five tests cover the empty Pages catalog, desktop/mobile populated cards, search and filters, covers, direct and invalid URLs, release playback and return, and local development playback with a registry milestone. |
| Hosted deployment | NOT_RUN | Candidate remains on its PR branch. |

Screenshots from the local browser runs: [desktop empty](evidence/m1-00/desktop-empty.webp), [mobile empty](evidence/m1-00/mobile-empty.webp), [desktop populated](evidence/m1-00/desktop-populated.webp), [mobile populated](evidence/m1-00/mobile-populated.webp), and [released detail](evidence/m1-00/game-detail.webp). Populated screenshots use disposable test entries. [Studio artwork source and runtime conversion](../../portal/artwork/README.md).

## M0-05 — Foundation Acceptance

- Status: accepted. The Producer explicitly approved M0-05 and accepted the Studio Foundation on 2026-11-26.
- Accepted main and public build: `e1fa67f83b8340869309157a000de23167f044d8` ([PR #6](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/6)). The [main deployment](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45843689277) passed and logged HTTP 200 with the exact published commit.
- Scope: production revision verification, full foundation regression, [game onboarding](../../games/README.md), and isolated release-path testing.
- Readiness: the Studio can receive new production packs. Independent build, registration, Pages assembly, portal launch and return were verified with isolated synthetic packages. The production registry is empty. Starting or importing a game requires separate Producer approval of the pack and target.

| Foundation requirement | Result | Evidence |
| --- | --- | --- |
| M0-01 — Toolchain, registry and portal | PASS (0) | Node 24.22.3, pnpm 11.25.0, frozen install, workflow lint, ESLint, strict typecheck, 29 registry tests and production build. |
| M0-02 — Library, detail, and game navigation | PASS (0) | Chromium smoke under the Pages subpath, desktop and mobile catalog, invalid IDs, fixture launch and return. |
| M0-03 — GitHub Pages and public revision | PASS | [Baseline main deployment](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45842086513) logged HTTP 200 at the [public site](https://huynhngocsonuit2000github.github.io/ai-game-studio/) and exact commit `cbd8998`. Main-push deploy and build marker passed. Manual dispatch remains configured. |
| M0-04 — Scope, assembly, and rollback | PASS (0) | Six pipeline regressions cover Git diff isolation, registry grants, complete artifact construction and local rollback preserving published routes. The [trusted scope check](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45843349052) passed on PR #6. |
| M0-05 — Independent onboarding | PASS (0) | Two synthetic packages installed and rebuilt independently in a temporary workspace. Both playable entries launched through the catalog and by direct URL, loaded their own assets, and returned to the portal. A third unpublished entry was absent from the artifact and catalog bundle. [Screenshot](evidence/m0-05/synthetic-catalog.png). |

The final local run passed 35 automated tests and five Chromium tests, plus full-site assembly and artifact validation. The scratch install uses the normal frozen lockfile path with cache preference. Offline-only verification failed because the workspace lacked cached package metadata. The workspace proxy blocked a direct public HTTP request, so production status comes from GitHub's public-URL smoke check. Synthetic onboarding and rollback ran locally. No synthetic game was published.

## M0-04 — Pages assembly, scope and rollback

- Status: accepted.
- Main baseline: `2dc6530e64af9ad36cd18adc5de9e97b9d5143d2`. Tested candidate: `30d272fc5a70d3e921b11cb5fd38b4aaa4918cd8`.
- Scope: trusted base-branch scope enforcement, whole-site assembly, released catalog and static output verification, Pages project-subpath browser regression, and rollback rehearsal.
- Approval: Producer explicitly approved M0-04 on 2026-11-26. Approved public main revision: `cbd8998a82ee1f3af62866768d91d87059c18077`. Next task: M0-05.

| Check | Result | Evidence |
| --- | --- | --- |
| M0-03 public deployment | PASS | [Main Actions run](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45839032307) logged HTTP 200 and the exact main commit. Producer visually verified the site. |
| Frozen setup, workflow lint, ESLint, TypeScript | PASS (0 each) | Node 24.22.3, pnpm 11.25.0, actionlint 1.7.12 |
| `pnpm test` | PASS (0) | 29 registry tests and six pipeline regression tests. Actual Git diff tested with a cross-game rename. |
| `pnpm build`, `pnpm assemble:pages`, `pnpm verify:pages` | PASS (0 each) | `deployment/dist/` contains the portal, all three required relative assets, and the release manifest. The current registry is empty. |
| Assembled-site browser regression | PASS (0) | Four Chromium tests under `/ai-game-studio/`, including catalog, unavailable ID and fixture launch/return. [Mobile screenshot](evidence/m0-04/assembled-site-mobile.png). |
| Rollback rehearsal | PASS (0) | Published two synthetic local games, rejected a broken candidate while preserving the artifact, updated one game, and restored its prior release with both game routes intact. |
| M0-04 live deploy | PASS | [Main deploy](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45842086513) verified HTTP 200 at `cbd8998` after PR #5 merged. Live rollback was NOT_RUN. |

The independent workspace HTTP probe was blocked by the network proxy. The successful hosted run and Producer verification provide live M0-03 evidence. GitHub Actions and the local rollback rehearsal did not change the live site.

Reproduce the candidate checks with the [deployment runbook](../../deployment/README.md). The local smoke used Chromium 156.0.8078.79 at `/usr/bin/chromium`.

## M0-03 — GitHub Actions and GitHub Pages

- Status: accepted. Producer approved and visually verified the public site on 2026-11-26. [Hosted verification](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45839032307) confirmed HTTP 200 and deployed commit `2dc6530e64af9ad36cd18adc5de9e97b9d5143d2`. [Public site](https://huynhngocsonuit2000github.github.io/ai-game-studio/).
- Recovery: PR #3 merged into `studio/m0-02-catalog` at `2406516`. Current main `8a91e16` lacks `pages.yml`, so that merge did not trigger a main deployment. The recovery PR targets main directly and adds a manual deployment trigger restricted to current main. Pages source is reported as GitHub Actions. Recovery checks passed workflow lint, build, lint, typecheck, 29 unit tests, four Chromium tests under the project subpath, and artifact validation. The workspace HTTP client and Cloud browser were blocked by the network proxy before receiving an origin response.
- Baseline: M0-02 PR #2 head `e1ca3c3530ca53ea8260b8f7b80c14586c5931b9`. Fetched current main `8a91e16107f498ccf124d059c5e17e26db83f69f` and verified its tree matches the M0-01 base of M0-02. Use the M0-02 branch as the review base while PR #2 remains open.
- Tested candidate: `883bec2487b37afe0c7e747e8950358d40c3c876`.
- Scope: GitHub Pages workflow, project-subpath tests, portal artifact validation, and hosting, onboarding and acceptance standards. Docker is optional.
- Approval: Producer approved the published M0-03 revision. Next task: M0-04, changed-path scope validation, full-site assembly and rollback verification.

| Check | Result | Evidence |
| --- | --- | --- |
| `actionlint` 1.7.12 | PASS (0) | Workflow lint passed |
| `pnpm setup`, `pnpm lint`, `pnpm typecheck`, `pnpm test` | PASS (0 each) | Frozen install and 29 unit tests |
| `STUDIO_PAGES_BASE_PATH=/ai-game-studio/ pnpm test:browser` | PASS (0) | Production build and four local Chromium tests. Inspected [mobile screenshot](evidence/m0-03/pages-subpath.png). |
| `pnpm verify:pages` | PASS (0) | Output index and three site-relative assets verified. In temporary copies, nonempty registry, fixture directory and root-relative asset each failed with the expected diagnostic. |
| Hosted deployment and published commit check | PASS | PR #4 merged into main. Hosted workflow reported HTTP 200 and the exact published revision. |

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
