# Studio integration, previews and PR delivery

## Observed repository contract

Verified at `main` commit `4bfdb37c79b921ea63efdcdaf1e3c9e1185aeeaf` on 2026-11-26. Node 24.22.3 and pnpm 11.25.0 are pinned. The workspace includes `games/*`, and the schema v1 registry is empty. The Forest Adventure pack arrived through PR #9. Portal production filters for public releases, and the Pages PR job assembles a verification artifact.

- Register the validated [draft](registry-entry.draft.json) via a separately reviewed Studio PR touching `registry/games.json`. Keep `entry` and `cover` null. The trusted `studio/production/registry-scope.json` has empty `registryFields` and `approvedHeads` maps. The checker rejects adding an ID in an ordinary game PR even with field grants because it requires the ID list to remain identical. The Studio can also approve an exact candidate SHA and path list on `main` via `approvedHeads`.
- Before S01, obtain Studio approval for the stable Phaser version and required root `pnpm-lock.yaml` changes for `@studio/forest-adventure`. A mixed game and lockfile PR needs the reviewed `approvedHeads` exception on `main` for its exact head SHA and changed paths. Any extension of candidate verification in `.github/workflows/pages.yml` requires separate Studio scope or inclusion in that reviewed authorization. The existing Pages verification assembles public releases. A development candidate needs its own typecheck, tests, build and Chromium smoke under the project subpath, with evidence attached to the PR.
- After the runtime is verified, request Studio approval for setting `entry` to `games/forest-adventure/index.html` and `cover` to `games/forest-adventure/cover.webp`. The Vite output needs a top-level `cover.webp` emitted from `assets/runtime/`, alongside `index.html`. Keep media URLs relative to the game.
- The portal base is `/ai-game-studio/` with detail route `#/games/forest-adventure`. The planned game path is `/ai-game-studio/games/forest-adventure/index.html`. Use `../../#/` for return navigation. Test links and media at the project subpath when the game builds.
- On Producer release approval set released/public with verified version/entry. Keep previously published games in full Pages assembly. Merge manually, verify HTTP, commit marker, direct entry, game assets and portal return. For rollback revert to last working package/build while preserving public IDs and routes. Run full assembly/smoke on rollback PR, and record actual deployed SHA and URL.

## Producer preview commands

From a checked-out candidate with pinned dependencies installed:

    pnpm --dir games/forest-adventure run build
    pnpm dev

After Studio authorizes the development entry and a build exists, open the local portal URL shown by Vite and go to `#/games/forest-adventure`. The portal renders Play preview when the registry entry path is non-null. Verify that it serves the built `dist/` output. Record the URL, branch, SHA and test run. If development registry integration is waiting on authorization, start the approved game package preview directly.

    pnpm --dir games/forest-adventure run preview -- --host 127.0.0.1

Alternatively share a CI ZIP with the exact candidate layout under games/forest-adventure/, SHA marker and portal preview output when available, serve it on Producer machine using a regular HTTP static server, and specify the direct relative entry. Example if the artifact includes an ai-game-studio/ parent directory:

    python3 -m http.server 8080 --bind 127.0.0.1

Open http://127.0.0.1:8080/ai-game-studio/games/forest-adventure/index.html from that directory. Direct game-only previews will not exercise the portal return link. Verify return in the combined preview. An Actions artifact does not provide a public playable URL. If the workspace has a configured forwarded preview, verify it before sharing; otherwise use local play and record remote preview as unavailable.

## Automated PR handoff

When the stage is candidate_ready, Codex Cloud uses branch prod/forest-adventure/sNN off the appropriate main or accepted base, reuses an open PR for the same head, and pushes only authorized paths. Include stage ID, candidate commit, task checks, evidence, Producer action and preview location. Do not merge automatically. Prefer native Codex PR capability. With authorized GitHub CLI access, the equivalent stage S01 pattern is:

    git push -u origin prod/forest-adventure/s01
    gh pr list --state open --head prod/forest-adventure/s01 --base main --json number,url
    gh pr create --base main --head prod/forest-adventure/s01 --title "Forest Adventure S01 — playable prototype" --body-file /tmp/forest-adventure-s01-pr.md

If an open match exists use gh pr edit with that body, not another create. If PR publication is blocked, save the exact SHA/diff, branch information and body in the permitted checkpoint/artifacts and report the actionable access failure. Verify the PR URL and separate Producer acceptance of the exact build. Public deployment starts only from verified merged main.
