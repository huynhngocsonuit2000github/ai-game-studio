# Studio implementation notes

## Inspected contract

Repository `huynhngocsonuit2000github/ai-game-studio`, target `games/monster-survivor/`. This additive pack leaves `baseCommit: null` in its envelope per the new-game validator and pins the observed reference in `GAME_STATE.json`. At import fetch latest main, compare authoritative registry, scope policy and build rules against that reference, record actual baseline and relevant drift. If there is already a target folder or entry, stop and reconcile scope; do not overwrite. New-game may not reuse Forest’s files or settings. Prefer clean target and dedicated branch `prod/monster-survivor/vertical-slice`. On resume identify pack digest and existing branch before attempting import again.

Read root `AGENTS.md`, `studio/standards/WORKFLOW_V5_1.md`, standards and matching game template. Onboarding `AGENTS.md` is intentionally generated in repo from trusted template: the pack validator blocks that basename, even under payload. Read and follow current G0/G2/G4 gating. This staged pack is data/assets/docs; build code is the next Codex task. Do not execute transferred scripts or compile image sources.

## First PR

- Create a buildable independent package called `@studio/monster-survivor`. Prefer zero-dependency Canvas 2D with Studio's existing root Vite/TS. Initial checks use Node 24.22.3 and pnpm 11.25.0 at observed baseline. The actual baseline fixture with a new dependency-free workspace package passed `pnpm install --frozen-lockfile`. pnpm added an empty game importer to its local lockfile even in that successful frozen run. Keep tool-generated scratch changes out of the game commit; inspect lockfile before and after, and restore only the confirmed empty importer in an isolated worktree when needed. If current trusted policy requires committing the empty importer, route it through separate Studio authorization. Any real dependency change needs Studio review.
- A game-only PR may create a new game directory. In observed scope policy, a game PR cannot add a new registry ID. Open the scoped game PR for S00–S03, keeping registry/shared/lockfile untouched. If an unforeseen lockfile or trusted config edit is truly required, follow the current separate Studio review process and continue safe work. No test-disable workaround. No external hosting or spending.
- Independent build emits `index.html` and `cover.webp` (copy from `assets/runtime/art/library-card.webp`). Runtime references are relative under `/ai-game-studio/games/monster-survivor/`. Portal return `../../#/` at that entry. Emit only approved runtime media, code and credits. Keep production verification on real Studio registry. While registration is pending and game is private, compare assembled artifact to base and serve the candidate independently at matching project subpath for direct, gameplay and return smoke. A catalog test fixture may demonstrate routing but cannot authorize or replace true assembly checks.
- Build and use actual `pnpm install --frozen-lockfile`, game commands, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm assemble:pages`, `pnpm verify:pages`, and `STUDIO_PAGES_BASE_PATH=/ai-game-studio/ STUDIO_TEST_ASSEMBLED_PAGES=1 pnpm exec playwright test`. Call Python pack tests as currently used in CI. Use pinned repository project scripts and indicate if game tests aren't discovered by root commands. Preserve Forest Adventure launch and progress. Attach actual screenshot/evidence if platform supports it; use a safe artifact rather than inventing a playable online URL.

## Registry proposal for separately reviewed Studio work

Only after scoped base and appropriate Producer/Studio review. Reconcile current schema. First private registration can keep entry/cover null if a verified build is unavailable. Once available, the proposal is:

| Field | Value |
| --- | --- |
| id / title | `monster-survivor` / Monster Survivor |
| description | Rekindle the Bellgrave Garden and turn Wick's lantern into a storm of spells. |
| engine / dimension | `other` / `2D` |
| status / visibility | `development` / `development` |
| entry / cover | `games/monster-survivor/index.html` / `games/monster-survivor/cover.webp` |
| categories | `Survival`, `Roguelite` |
| version / milestone | `0.1.0` / `S03 · Polished vertical slice` |

A later separate decision can make a reviewed candidate public. Verify game output and the existing portal handles cover, launch, filters and return without new schema. After a public route exists, use the current rollback contract for fixing a release. Live release evidence records `build-sha.txt`, `release-manifest.json`, actual game URL, smoke test and Producer review.
