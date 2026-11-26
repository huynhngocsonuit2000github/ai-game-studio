# GitHub Pages deployment

GitHub Pages is the Studio's primary host. The [Pages workflow](../.github/workflows/pages.yml) validates pull requests, saves browser evidence, and deploys the verified artifact automatically after an authorized merge into `main`. A PR run has read-only permissions and produces no deployment. A manual run can also deploy from `main`.

## Repository setup

1. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. A repository administrator can make this change.
2. If the `github-pages` environment has deployment branch rules, allow `main`. For automatic deployment after merging, keep the environment free of a second manual approval gate.
3. Review and merge the approved PR. In **Actions**, open **Verify and deploy to GitHub Pages** for that main commit. Confirm that the deploy job and its published revision smoke test passed.
4. Use the deployment URL reported by the workflow. Confirm the home page loads and that `build-sha.txt` matches the main commit. For a game release, also smoke-test the published game and its return path. Record the URL, SHA and result in the milestone evidence.

## Recover a missing deployment

Check that `.github/workflows/pages.yml` exists on `main` and inspect the merged PR's base branch. A merge into a milestone branch only updates that branch. Open a PR into `main` carrying the workflow and its application dependencies if they are missing there.

Once the workflow exists on `main`, open **Actions → Verify and deploy to GitHub Pages → Run workflow**, select **main**, and run it. With an authenticated GitHub CLI, use `gh workflow run pages.yml --ref main`. The manual run repeats verification before deployment. Other branches can run checks, but only the current main revision can publish. Recheck the deployment URL and commit marker before closing the milestone.

## Local verification

From the repository root, run the pinned setup in the [portal README](../portal/README.md), then run the following.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm assemble:pages
pnpm verify:pages
STUDIO_PAGES_BASE_PATH=/ai-game-studio/ STUDIO_TEST_ASSEMBLED_PAGES=1 pnpm exec playwright test
```

Set `STUDIO_CHROMIUM_PATH` to a compatible installed Chromium executable when a browser download is unavailable. Browser smoke serves the assembled artifact under the project subpath. Docker is optional.

The workflow publishes `deployment/dist/` with a commit marker and release manifest. Assembly rebuilds public releases and explicitly public development previews. Studio review requires asset clearance before setting a preview to public. Each game package under `games/<id>/` must provide a `pnpm run build` script that produces a fresh `dist/`. Its entry and cover must be under `games/<id>/` and exist in the assembled site. Game outputs must contain regular files and directories. The entry needs relative asset URLs and a return link. Private development entries are excluded. A preview can be withdrawn by reverting its public visibility, and released entry paths remain protected.

CI uses trusted main registry history to protect previously public IDs and entry paths, including in reruns. A normal update or rollback must keep all of those routes. Retiring a route requires an explicit Studio release-policy change.

## Failure and rollback

A failed validation prevents a new deployment. If provisioning fails, check the Pages source and environment rules, then rerun the workflow for the current main commit. For a faulty release, open a revert PR for the offending changes. If a normal revert would remove a public game, restore the previous working version while preserving the published entry. Build and smoke-test the complete rollback artifact. After authorized merge, verify HTTP 200, the commit marker and the released routes. The local regression suite rehearses an update, a failed candidate and a rollback with two synthetic games. Deploying old runs is skipped once main has advanced.
