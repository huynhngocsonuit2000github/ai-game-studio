# Nhà Kính Sau Nửa Đêm

A Vietnamese single-player browser lane defense by AI Game Studio. Three handcrafted stages defend one greenhouse during a storm. The principal mechanic is a single water route shared by the economy and the Orchid chain attack.

- Game ID: `midnight-greenhouse`
- Start at `production/PROGRESS.md`, then `production/PRODUCTION_PLAN.md` and the active `stages/Sxx/STAGE.md`.
- Gameplay rules and authored waves live in `design/GDD.md` and `design/TUNING.json`.
- `production/ASSET_MANIFEST.csv` records the included visual/audio files and their provenance. All exports are independent of paid runtime services.

## S03 playtest

This candidate opens **Sân Mưa**, the first of the three designed stages. Select **Vào nhà kính → Chọn Sân Mưa → Bắt đầu ca trực**. The two later stages are shown on the campaign map and await the next production stage.

The draft PR's **Verify and deploy to GitHub Pages** workflow uploads the `browser-evidence` artifact. Extract that archive, then extract `midnight-greenhouse-s03.zip` and open `PLAYTEST.txt`. The standalone ZIP includes an HTTP launch command and the tested revision.

From a checkout of the candidate, you can also build and play locally with Node 24.22.3, pnpm 11.25.0 and Python 3:

```sh
pnpm install --frozen-lockfile
pnpm --filter @studio/midnight-greenhouse build
python3 -m http.server 8089 --bind 127.0.0.1 --directory games/midnight-greenhouse/dist
```

Open `http://127.0.0.1:8089/`. For the tested portal route and scoped test commands, see [QA evidence](reports/QA_REPORT.md).

### Producer checklist

1. Can you find the first threat, plant Bình Hứng and Dương Xỉ, and turn a valve during the 20-second preparation?
2. Move water from collectors to a lane with Lan Sét when enemies bunch up. Was the income-versus-shock decision clear? Can you tell why a raincoat needs physical damage?
3. Try a full run and a retry. Check when you first needed to reinforce another lane, what you learned from a breach, and whether the last two waves still required decisions.
4. On a real landscape phone, check the top and bottom valves, planting, removal and game text. Listen for rain, the change in score, shock, warning and breach cues. Try mute and verify that a reload retains your record and settings.

Record the exact draft head and device with the G2 decision. S04–S05 resume on the same branch and PR after Producer G2.
