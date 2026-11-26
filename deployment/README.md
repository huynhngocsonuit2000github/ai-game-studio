# GitHub Pages deployment

GitHub Pages is the Studio's primary host. The [Pages workflow](../.github/workflows/pages.yml) validates pull requests, saves browser evidence, and deploys the verified artifact automatically after an authorized merge into `main`. A PR run has read-only permissions and produces no deployment.

## Repository setup

1. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. A repository administrator can make this change.
2. If the `github-pages` environment has deployment branch rules, allow `main`. For automatic deployment after merging, keep the environment free of a second manual approval gate.
3. Review and merge the approved PR. In **Actions**, open **Verify and deploy to GitHub Pages** for that main commit. Confirm that the deploy job and its published revision smoke test passed.
4. Use the deployment URL reported by the workflow. Confirm the home page loads and that `build-sha.txt` matches the main commit. For a game release, also smoke-test the published game and its return path. Record the URL, SHA and result in the milestone evidence.

## Local verification

From the repository root, run the pinned setup in the [portal README](../portal/README.md), then run the following.

```sh
pnpm lint
pnpm typecheck
pnpm test
STUDIO_PAGES_BASE_PATH=/ai-game-studio/ pnpm test:browser
pnpm verify:pages
```

Set `STUDIO_CHROMIUM_PATH` to a compatible installed Chromium executable when a browser download is unavailable. Browser smoke builds the portal and checks it under the project subpath. Docker is optional.

The foundation workflow publishes `portal/dist/` with a commit marker. Its artifact check rejects a nonempty registry until M0-04 adds full-site assembly. Each production 2D and 3D game needs an independent static entry, relative asset URLs, and a return link. Include every released game in the full-site artifact.

## Failure and rollback

A failed validation prevents a new deployment. If provisioning fails, check the Pages source and environment rules, then rerun the workflow for the current main commit. If a published release is faulty, open a revert PR for the offending changes. After authorized merge, verify the replacement deployment and its commit marker. Deploying old runs is skipped once main has advanced.
