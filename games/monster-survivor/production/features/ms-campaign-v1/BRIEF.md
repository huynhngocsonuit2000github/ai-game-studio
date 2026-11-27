# Monster Survivor — Campaign and Gear

| Field | Value |
| --- | --- |
| Feature | MS-CAMPAIGN-V1 · expansion |
| Game | `monster-survivor` under `games/monster-survivor/` |
| Pack | `monster-survivor-campaign-v2` |
| Observed source and deployed baseline | `85955db765164f52ea2cea2c4c0878321e81fc4c` |
| Existing public build | Normal runs on Bellgrave Garden, one map with two wards and a timed Warden duel. Registry app version 0.1.0, public In Development. |
| Save baseline | Normal v1 settings, skin, records and discoveries. See [SAVE_AND_QA.md](SAVE_AND_QA.md). |
| Batch | Monster Survivor Campaign v1, all parts below in one scoped game PR. |

The Producer approved Campaign direction and requested a single Codex Cloud implementation batch. Actual import and preview authorization come from the external prompt. This is design/data input. The existing public preview's code is the rollback baseline.

## Player experience

**Campaign** is primary on the title; **Survival** launches the current Normal game with its existing tuning, settings and records. Campaign opens a camp with Stage Select, Equipment, Upgrades and a visible gold balance. Players can select unlocked stages freely. First entry defaults to stage 1 and starter equipment. Layout and objectives come from [stages.json](stages.json). Each stage has a different route, goal, loot decision and combat finale. The target successful duration is 3–5 minutes per stage. Read this as a playtest band. Tune encounters and route density rather than adding mandatory waits. An exit becomes available when the final objective is met, regardless of elapsed time. The campaign completion screen appears on the first clear of stage 5 and allows replay afterward.

Sequence objective blocks as listed, except the two hunts that work in either order. Show upcoming objectives as unavailable before their prerequisite. Activate patrol groups and nests with distance cues (about 190 px); an initial small group near the starting path makes the first draft reachable. Per pack, spread initial enemies outside the hero's damage grace radius and show the objective marker immediately. Challenge sections may use waves or gates only when the player can still move to safety. During defense, foes actively attack the lantern, the second wave starts four seconds after the first clears, and a destroyed lantern causes defeat. The optional chest route must always connect to the main route. After a leader dies, remaining ambient spawns stop so the player can collect drops before leaving.

Draw objective and exit markers both on scene and off-screen, and show a compact stage counter and current requirement. Locked stages show their unlock requirement. Camp uses a four-slot equipment grid, comparison with exact deltas, unambiguous equipped/upgrade states and confirmation for spending. First clear shows the guaranteed item, earned gold, and unlocked stage. A single Continue returns to camp with the next unlocked stage selected. Retry keeps the same stage, rolls a fresh run ID and equips the selected camp loadout. Pause, rotate, restart confirmation, audio unlock and keyboard/touch input use the existing overlay patterns. Add contextual hints only for first-time actions.

## Loot and combat

See [gear.json](gear.json) for 12 permanent items, fixed per-slot effects, costs, duplicate rewards and clear rewards. Permanent loot appears on the map. Walk over gold, equipment pickups and one-use boosters. Open marked chests and the exit with E or a visible, contextual touch control. Add world label, brief item notification and once-per-source collectible state. Branch chests are off the mandatory route and may have an optional escort or pack. Pickups use a device performance budget. Merge gold visually in dense encounters without dropping its value. Enemy gold uses a per-stage kill budget, so a stalled defense cannot print infinite gold. Normal Survival's pickups and affinity stay untouched.

Permanent kit applies at stage start. Temporary ranks, healing and buffs reset between attempts. Campaign reuses the existing 16 spell entries and four combinations, with separate tuning. Wick Dart starts at 20 damage every 0.60 seconds, followed by first-draft Rank II splash for 40% damage. Splash excludes the direct target and never recurses. The first draft includes that rank and a distinct spell choice. If the player selects the other spell, keep a legal Rank II choice in the next draft until learned. Later ranks preserve pierce, pattern and evolution identity. Cap modifiers using the combat values in gear.json. Use distinct particles/sounds for splash, damage and a new active ability **Lantern Burst**. KO charge is shown in HUD. On Q or touch Burst, clear a nearby cluster or save it for an elite. No cooldown or damage is paid if the draft/pause screen consumes input. Existing dash remains on Space/touch, and initial weapon feels useful with a fresh unupgraded save.

Tune by target feel and observed runs. Fresh ải 1 basic foes should take 1–2 clean landed shots, the first draft should arrive by about 20 seconds with ordinary attack/movement, and unupgraded first clear can afford the first upgrade. Compare the guaranteed weapon's +1 against the same stage-2 encounter using the same stage seed, Rank II Dart, starting state and movement path. Aim for at least 15% faster ordinary group clear in that comparison, without removing elite dodge windows or the Warden's three phases. Measure actual results and record deviations.

## Weapon presentation

Implement [WEAPON_VFX.md](WEAPON_VFX.md) in this batch, including distinct spell silhouettes, visible gear/rank feedback, readable combat effects and low-detail verification.

## Implementation order within one batch

1. **MSC-10 · Camp and first stage.** Integrate stage entry, movement/combat and objectives, guaranteed loot, settlement, and accessible equip and upgrade UI. Verify the full loop through stage 2 before adding the other maps.
2. **MSC-20 · All maps.** Author all five distinct layouts and objectives from the map briefs, connect loot, stage gates and victory, implement the full weapon FX and loot presentation, integrate existing art and audio.
3. **MSC-30 · Fix and verify.** Run full Campaign, persistence, playfeel test, Survival and Studio regression, then prepare one PR. Mark complete from actual evidence. Intermediate reviews are deferred for this named batch, with internal criteria checked on each part. Keep final preview review and manual merge with the Producer.

Reuse the shipped runtime tiles, painted characters/props, atlas glyphs, and audio under the existing media grant. Compose distinct maps with authored geometry, palette values, encounter silhouettes, and repurposed painted props. New pickup and item markers may use authored Canvas geometry and existing glyphs. This pack includes no new media. Keep visual routes, enemy tells, loot and interactive landmarks distinct across all five maps. No dependency adds. Apply only inside the target game. Link this brief from the current checkpoint, retain historic results and update the canonical game state with tested evidence. Shared workflows, registry, Forest Adventure and automatic merge sit outside the authorized game diff. The existing public preview entry already launches the game.
