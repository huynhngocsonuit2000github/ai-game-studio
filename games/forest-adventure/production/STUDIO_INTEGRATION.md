# Studio integration, previews and PR delivery

## Observed repository contract

Verified at `main` commit `4bfdb37c79b921ea63efdcdaf1e3c9e1185aeeaf` on 2026-11-26. Node 24.22.3 and pnpm 11.25.0 are pinned. The workspace includes `games/*`, and the schema v1 registry is empty. The Forest Adventure pack arrived through PR #9. Portal production filters for public releases, and the Pages PR job assembles a verification artifact.

- The trusted `studio/production/registry-scope.json` has empty `registryFields` and `approvedHeads` maps at the S01 base. The checker rejects adding an ID in an ordinary game PR even with field grants, because its ID list must stay identical. A mixed game and lockfile PR also needs a reviewed exact-head exception.
- The portal base is `/ai-game-studio/` with detail route `#/games/forest-adventure`. The planned game path is `/ai-game-studio/games/forest-adventure/index.html`. Use `../../#/` for return navigation. Test links and media at the project subpath when the game builds.
- On Producer release approval set released/public with verified version/entry. Keep previously published games in full Pages assembly. Merge manually, verify HTTP, commit marker, direct entry, game assets and portal return. For rollback revert to last working package/build while preserving public IDs and routes. Run full assembly/smoke on rollback PR, and record actual deployed SHA and URL.

## Producer preview commands

S01 registers Forest Adventure with `status: development` and `visibility: development`. Its verified entry and cover are inside `games/forest-adventure/`. Test the development catalog from the candidate checkout.

    pnpm install --frozen-lockfile
    pnpm --filter @studio/forest-adventure build
    pnpm --filter @studio/portal dev --host 127.0.0.1 --port 4181 --strictPort --base /ai-game-studio/

Open `http://127.0.0.1:4181/ai-game-studio/#/games/forest-adventure` and choose Play preview. Build first so the portal can serve the game package's `dist/` files.

S01 changes `registry/games.json` and `pnpm-lock.yaml` under the Producer's authorization. The base policy still needs a separately reviewed `approvedHeads` entry keyed by the S01 PR head, with the complete set of changed paths from `git diff --name-only --no-renames origin/main...HEAD`. The existing trusted workflow reads that policy from `main`.

Public Pages continues to select only public released games. The Producer directed S01 to keep the preview local pending D06 rights clearance. Any future public In Development build requires a reviewed Studio change that admits explicitly public development builds in the catalog and Pages assembly together. The S01 build and browser tests use the project subpath.

Alternatively share a CI ZIP with the exact candidate layout under games/forest-adventure/, SHA marker and portal preview output when available, serve it on Producer machine using a regular HTTP static server, and specify the direct relative entry. Example if the artifact includes an ai-game-studio/ parent directory:

    python3 -m http.server 8080 --bind 127.0.0.1

Open http://127.0.0.1:8080/ai-game-studio/games/forest-adventure/index.html from that directory. Direct game-only previews will not exercise the portal return link. Verify return in the combined preview. An Actions artifact does not provide a public playable URL. If the workspace has a configured forwarded preview, verify it before sharing; otherwise use local play and record remote preview as unavailable.

## Automated PR handoff

When the stage is candidate_ready, Codex Cloud uses branch prod/forest-adventure/sNN off the appropriate main or accepted base, reuses an open PR for the same head, and pushes only authorized paths. Include stage ID, candidate commit, task checks, evidence, Producer action and preview location. Do not merge automatically. Prefer native Codex PR capability. With authorized GitHub CLI access, the equivalent stage S01 pattern is:

    git push -u origin prod/forest-adventure/s01
    gh pr list --state open --head prod/forest-adventure/s01 --base main --json number,url
    gh pr create --base main --head prod/forest-adventure/s01 --title "Forest Adventure S01 — playable prototype" --body-file /tmp/forest-adventure-s01-pr.md

If an open match exists use gh pr edit with that body, not another create. If PR publication is blocked, save the exact SHA/diff, branch information and body in the permitted checkpoint/artifacts and report the actionable access failure. Verify the PR URL and separate Producer acceptance of the exact build. Public deployment starts only from verified merged main.
