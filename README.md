# AI Game Studio V5.1
A web-first monorepo for independent original 2D and 3D games, with a portal and static builds under the GitHub Pages project subpath.

For an existing Studio, start with the [V5.1 prompt and ZIP workflow](studio/standards/WORKFLOW_V5_1.md). It covers import, feature and bug-fix handoffs, resume, and the Studio approval path for shared changes.

## Local development

See [portal setup and verification](portal/README.md) and the [approved game onboarding workflow](games/README.md).

## Start a new repository from the Foundation Pack
1. Extract this pack into the root of a new GitHub repository (main). Preserve existing README history if needed; review files before upload.
2. Connect the repository to a Codex Cloud environment. Use the Node/pnpm versions selected and pinned by M0. No secrets in this pack.
3. Submit the prompt in START_CODEX.md. Merge only a verified, authorized PR.
4. Configure GitHub Pages to deploy from GitHub Actions. Follow the [deployment runbook](deployment/README.md) to verify the first authorized deployment.
5. Run `Continue studio` for the next eligible slice. Import game packs only after foundation acceptance.

## Layout
portal/ = game library and development views; games/<id>/ = independent game; registry/ = validated catalog; shared/ = approved reusable packages; studio/ = contracts, templates, progress; deployment/ = hosting; .github/workflows/ = CI. Empty future directories are represented by their README files.

## Defaults
React + TypeScript + Vite portal with pnpm workspaces, Vitest and Playwright. Use Phaser for 2D and Three.js for 3D where justified. GitHub Pages is the primary host, with automatic GitHub Actions deployment from verified main after human merge. Local preview uses Vite. Docker is optional.
