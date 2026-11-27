# Monster Survivor

Dark-cute top-down survival roguelite for the AI Game Studio web library. Wick, a little lantern keeper, fights through the Bellgrave Garden, rekindles the Orchard Ward, and duels the Hollow Warden before the garden closes.

- [Game design](design/GDD.md), [content data](design/data/), [art](design/ART_DIRECTION.md), [UI](design/UI_UX.md), [audio](design/AUDIO_PLAN.md)
- [Technical design](design/TECH_DESIGN.md), [Studio integration](production/STUDIO_INTEGRATION.md)
- [Milestones](production/PRODUCTION_PLAN.md), [current checkpoint](production/PROGRESS.md), [acceptance](production/QUALITY_GATES.md), [test plan](reports/TEST_PLAN.md)
- [Asset manifest](production/ASSET_MANIFEST.csv) and [rights record](production/RIGHTS.md)

The G2 slice uses the original art and audio, tuning data and specifications imported with the production pack.

## Play the G2 candidate locally

From the Studio root, run the pinned Node and pnpm toolchain.

```sh
pnpm install --frozen-lockfile
pnpm --dir games/monster-survivor build
pnpm --dir games/monster-survivor exec vite preview --host 127.0.0.1 --port 4177
```

Open the URL printed by Vite. Move with WASD or arrows, dash with Space, and choose upgrades with 1–3 or pointer. On touch devices play in landscape with the joystick and Dash. Stand inside the Orchard Ward for six seconds before 04:00. The Hollow Warden must fall by 05:30.

The static build lives in the game’s `dist/` directory. To exercise the Studio return link, serve it at `/ai-game-studio/games/monster-survivor/` alongside a local copy of the assembled Studio portal. The canonical registry has no Monster Survivor entry.

```sh
pnpm --dir games/monster-survivor typecheck
pnpm --dir games/monster-survivor test
```

See the [QA report](reports/QA_REPORT.md) for browser reproduction and the [checkpoint](production/PROGRESS.md) for gate status.
