# Portal

The React and TypeScript portal renders the public game library. The production registry starts empty. The build validates the registry before bundling the portal and writes static files to `portal/dist/`.

Install Node 24.22.3 and pnpm 11.25.0 (`npm install --global pnpm@11.25.0`), then run the following from the repository root.

```sh
pnpm setup
pnpm dev
```

Open the local URL printed by Vite. The setup script installs the locked dependencies and Playwright Chromium. On Linux, install missing browser system packages with `pnpm exec playwright install-deps chromium` if needed. If browser downloads are unavailable and a compatible Chromium is installed, set `STUDIO_CHROMIUM_PATH` to its executable for setup and browser tests. If the default pnpm store is unwritable, set `PNPM_CONFIG_STORE_DIR` to a writable directory.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
```

Browser smoke rebuilds and serves the production bundle under `/studio/`. It checks the empty library at desktop and mobile viewport widths, records console and network failures, and writes screenshots to `test-results/`.

The library uses `#/` and game detail pages use `#/games/<id>`. These routes work on a static host under a site subpath. A game launches from its validated site-relative entry path. Unknown or unavailable IDs show a link back to the library.

`pnpm dev` adds the development-only Navigation Fixture to the catalog. Open its detail page, launch the independent game, choose the square, and use the return link. The production build excludes the fixture and uses the canonical registry. Browser smoke exercises production and development on separate local subpaths.
