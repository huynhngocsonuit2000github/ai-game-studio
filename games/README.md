# Onboard a game

Start after Producer approval of the Foundation and the specific game scope or import. Use the [V5.1 handoff](../studio/standards/WORKFLOW_V5_1.md), [game template](../studio/templates/game/) and [import checklist](../studio/templates/IMPORT_CHECKLIST.md). Assign an immutable lowercase kebab-case ID and keep the package, sources, assets, tests, and production records under `games/<id>/`.

## Develop and build independently

- Give the game a private workspace package with an explicit `build` script that produces a fresh static `dist/`. Use `pnpm --dir games/<id> run build` from the repository root. Run the game's own tests from that directory.
- Use relative URLs for runtime assets and the portal return link. For an entry at `games/<id>/index.html`, the library return link is `../../#/`. Test the game under the Pages project subpath, including a direct load and representative gameplay.
- Keep unrelated games unchanged. When an approved onboarding needs a shared lockfile or another cross-scope change, follow the [trusted scope policy process](../.github/workflows/README.md). Resolve the authorization before merging.

## Register and release

1. Add the approved ID to the [registry](../registry/README.md) with development visibility. Keep `entry` null until its output is verified. An approved release uses `status: "released"` and `visibility: "public"` with an existing entry such as `games/<id>/index.html`.
2. Build the complete site with the [deployment runbook](../deployment/README.md). The assembler builds each public game into its own site directory. Check catalog detail, launch, direct entry, relative assets, return, and preservation of other published games.
3. Capture browser and QA evidence in the game's records. Open the PR and stop for the applicable approval. After an authorized merge to `main`, confirm the deployed revision and play the live game through the portal.

The foundation onboarding regression builds two synthetic games in a temporary workspace and exercises the release path on a local static server. Run it after the pinned root setup with `pnpm exec playwright test onboarding.spec.ts`. It leaves the production registry unchanged.
