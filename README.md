# AI Game Studio V5
A web-first monorepo for independent original 2D and 3D games. The foundation includes a runnable portal with an empty game library.

## Local development

See [portal setup and verification](portal/README.md).

## Start a new repository from the Foundation Pack
1. Extract this pack into the root of a new GitHub repository (main). Preserve existing README history if needed; review files before upload.
2. Connect the repository to a Codex Cloud environment. Use the Node/pnpm versions selected and pinned by M0. No secrets in this pack.
3. Submit the prompt in START_CODEX.md. Merge only a verified, authorized PR.
4. Configure GitHub Pages to deploy from GitHub Actions. Follow the [deployment runbook](deployment/README.md) to verify the first authorized deployment.
5. Run `Continue studio` for the next eligible slice. Import game packs only after foundation acceptance.

## Layout
portal/ = game library and development views; games/<id>/ = independent game; registry/ = validated catalog; shared/ = approved reusable packages; studio/ = contracts, templates, progress; deployment/ = hosting; .github/workflows/ = CI. Empty future directories are represented by their README files.

## Defaults
React + TypeScript + Vite portal; pnpm workspaces; Phaser for 2D and Three.js for 3D where justified; Vitest and Playwright. GitHub Pages is the primary host, with automatic GitHub Actions deployment from verified main. Local preview uses Vite. Docker is optional. Game engines are planned for later tasks.
