# Studio integration, previews and PR delivery

## Observed repository contract

Read-only reference: huynhngocsonuit2000github/ai-game-studio, main, inspected 2026-11-26. Root package pins Node 24.22.3 and pnpm 11.25.0, and pnpm-workspace.yaml includes games/*. The schema v1 registry was empty. Root AGENTS.md supports automatic per-stage PRs. Pages builds public released entries only, and its PR verify job does not publish a candidate. Repository registry, paths, portal behavior and scope policy can change. Recheck on the exact stage base before editing.

- Install approved dependencies into @studio/forest-adventure and regenerate only the shared lockfile entries required by this package. This is cross-scope. S00 records the separately approved import/registry authorization and lockfile/CI scope needed by S01. Use the trusted policy on main and existing scope workflow, including exact-head authorization if required. Never bootstrap permissions via candidate PR metadata.
- Import the game folder first with registry entry and cover null until runtime output is verified. A draft entry is provided in registry-entry.draft.json. Apply only the registry changes that the authorized scope permits. Revalidate against portal/src/registry.ts before opening a PR.
- After verification set development entry to games/forest-adventure/index.html and cover to games/forest-adventure/cover.webp. Game Vite output needs a top-level cover.webp copied or emitted from assets/runtime/, alongside index.html. Keep banner and other media relative and bundle only the required files.
- Portal base /ai-game-studio/ and detail hash #/games/forest-adventure. Game direct path /ai-game-studio/games/forest-adventure/index.html. Use ../../#/ return navigation. Test real links and media at project subpath.
- PR Pages validation only assembles public releases on the inspected main. To catch development failures, a scoped Studio integration change must include the verified per-game typecheck/tests/build and Chromium stage smoke against candidate output, with build/test artifact upload. Reuse root workflow conventions and existing runner. No extra hosting service.
- On Producer release approval set released/public with verified version/entry. Keep previously published games in full Pages assembly. Merge manually, verify HTTP, commit marker, direct entry, game assets and portal return. For rollback revert to last working package/build while preserving public IDs and routes. Run full assembly/smoke on rollback PR, and record actual deployed SHA and URL.

## Producer preview commands

From a checked-out candidate with pinned dependencies installed:

    pnpm --dir games/forest-adventure run build
    pnpm dev

Open the local portal URL shown by Vite and go to #/games/forest-adventure. A Play preview link appears when the registry contains this entry and the game has a verified dist/. Record actual URL, branch, SHA and a completed test run. If development registry integration is waiting on authorization, start the approved game package preview directly:

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
