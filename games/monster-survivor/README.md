# Monster Survivor

Dark-cute top-down survival roguelite for the AI Game Studio web library. Wick, a little lantern keeper, explores five Campaign stages and brings gold and gear back to Lantern Camp. Survival offers the Bellgrave Garden ward rites and timed Hollow Warden duel.

- [Game design](design/GDD.md), [content data](design/data/), [art](design/ART_DIRECTION.md), [UI](design/UI_UX.md), [audio](design/AUDIO_PLAN.md)
- [Technical design](design/TECH_DESIGN.md), [Studio integration](production/STUDIO_INTEGRATION.md)
- [Milestones](production/PRODUCTION_PLAN.md), [current checkpoint](production/PROGRESS.md), [acceptance](production/QUALITY_GATES.md), [test plan](reports/TEST_PLAN.md)
- [Asset manifest](production/ASSET_MANIFEST.csv) and [rights record](production/RIGHTS.md)

Campaign and Survival share the original art and audio. Campaign progression uses a separate save from Survival records and shared settings.

## Play locally

From the Studio root, run the pinned Node and pnpm toolchain.

```sh
pnpm install --frozen-lockfile
pnpm --dir games/monster-survivor build
pnpm --dir games/monster-survivor exec vite preview --host 127.0.0.1 --port 4177
```

Open the URL printed by Vite. Move with WASD or arrows, dash with Space, and choose upgrades with 1–3 or pointer. On touch devices play in landscape with the joystick and Dash.

- **Campaign** opens Lantern Camp. Clear each stage to unlock the next one. Collect gear and gold, upgrade equipment at camp, and use **E** to open a chest or confirm an exit. Press **Q** when Lantern Burst is charged. Touch controls show these actions when available.
- **Survival** starts the original Bellgrave Garden run. Stand inside any two ward rings for nine seconds each and finish both rites by 13:30. The Hollow Warden must fall by 15:30.

The static build lives in the game’s `dist/` directory. To exercise the Studio return link, serve it at `/ai-game-studio/games/monster-survivor/` alongside a local copy of the assembled Studio portal. The canonical registry lists the currently deployed preview as In Development.

```sh
pnpm --dir games/monster-survivor typecheck
pnpm --dir games/monster-survivor test
```

See the [QA report](reports/QA_REPORT.md) for browser reproduction and the [checkpoint](production/PROGRESS.md) for gate status.

[Normal candidate QA](reports/RELEASE_QA.md) · [Playtest, release and rollback](production/RELEASE.md)
