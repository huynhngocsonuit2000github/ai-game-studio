# AI Game Studio V5
A web-first monorepo for independent original 2D and 3D games. This is a foundation specification pack, not a working portal or game build.

## Start
1. Extract this pack into the root of a new GitHub repository (main). Preserve existing README history if needed; review files before upload.
2. Connect the repository to a Codex Cloud environment. Use the Node/pnpm versions selected and pinned by M0. No secrets in this pack.
3. Submit the prompt in START_CODEX.md. Merge only a verified, authorized PR.
4. Enable GitHub Pages with GitHub Actions after the deployment workflow exists. Verify the actual URL before claiming deployment.
5. Run `Continue studio` for the next eligible slice. Import game packs only after foundation acceptance.

## Layout
portal/ = game library and development views; games/<id>/ = independent game; registry/ = validated catalog; shared/ = approved reusable packages; studio/ = contracts, templates, progress; deployment/ = hosting; .github/workflows/ = CI. Empty future directories are represented by their README files.

## Defaults
React + TypeScript + Vite portal; pnpm workspaces; Phaser for 2D and Three.js for 3D where justified; Vitest and Playwright; static web hosting and Docker preview. No backend in M0. These are proposed architecture decisions, not installed dependencies.
