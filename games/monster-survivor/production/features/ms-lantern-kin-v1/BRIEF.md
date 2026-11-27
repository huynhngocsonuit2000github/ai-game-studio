# Monster Survivor — Lantern Kin / Linh Thú Hộ Đèn

Feature MS-LK-1. Expansion pack `monster-survivor-lantern-kin-v1`. Pinned base `2fef3a8e97ae219767bad273bd67ea6724408306`. Main contains the 5-stage Campaign and upgraded Armory. The existing Pages entry is public In Development. One game-only PR. Use existing loadout, Campaign stat and attack pipelines, objective renderer, audio, transactions and static hosting. The pack brings six original sprite exports and the behavior below.

## Player loop and unlocks

Campaign remains the primary action. Existing cleared stage 5 unlocks stage 6. Clear stage 6 to unlock 7 and 7 to unlock 8. Existing clear evidence is sufficient; no reset. The new story path ends only after the stage 8 boss and using its exit. Existing stage 5 completion becomes chapter completion where appropriate. Replay earlier maps in harder variants, return to the existing camp and choose a single equipped companion and one equipped engraving on the active weapon. Selecting none is allowed at all times. Each attempt snapshots the selection. Survival remains separately playable with its own tuning, save and controls.

**Difficulty.** All eight Campaign maps support Normal / Elite / Nightmare. Clear the previous tier of the same stage to unlock its next tier. Old clear IDs count as Normal clears. Normal for stages 1–5 uses the shipped objectives and encounter tuning. Implement assignments from stage ID, difficulty and phase. Elite introduces one coordinated shield/support pair or an authored reinforcement during a recovery window, about 1.25× eligible normal HP and 1.10× contact/attack damage. Nightmare adds a stage-specific hazard or ambush, 1.50× normal HP and 1.20× damage, with a second sequential pressure beat rather than unavoidable simultaneous patterns. Boss/elite HP cap multipliers 1.15×/1.25× and preserve all telegraphs and vulnerable windows. Use separate timer headroom for variants. Enforce visible safe approach, hard caps and no required grind on Normal. Show reward, selected tier and unlock conditions before entry.

## Three authored maps

Use separate data/geometry per map, reusing existing tiles and props where sensible. Distinguish fog, ash and eclipse visually with silhouettes and floor marks. Start ordinary combat quickly, check reachable goals, cues and unobstructed mobile safe areas. Target 4–7 minutes of normal play per new stage as an authored pacing band, never insert idle waits. Coordinates are anchor guidance in world px, origin top left, logical camera unchanged.

| Stage | Required flow | Optional and higher-tier pressure |
| --- | --- | --- |
| 6 · Rừng Sương / Mistwood · 2080×1340 | Start (220,900), light waymarks (540,880), (940,570), (1300,780); unveil the Fog Keeper at (1740,500), exit (1900,450). Waymarks dispel local fog, unlock in route order, and use 2.5 s interact/hold or equivalent accessible switch. Fog obscures distant scenery, retaining hazards, route markers, foes within threat distance and Reduced Motion readability. Keeper alternates a visible cone and shelter window. | North flooded detour has a food cache. Elite escorts waymark 2 with shield/support pair; Nightmare has a clearly striped moving fog lane with a safe edge. First Normal clear unlocks Moon Owl. |
| 7 · Mỏ Tro / Ash Mine · 2200×1400 | Start (220,700). Defeat two foundry guards (710,450) and (850,930) in either order to unlock the furnace at (1650,690). Furnace Overseer has two charge lanes and cooling recovery, exit (2000,710). Separated narrow branches reconnect before furnace. | Side rescue cage (1300,390) or supply cache (1310,1040); both recompense exploration and can be completed on separate attempts. Player can also take both if desired. First clean exit after cage rescue unlocks Moss Turtle; cage remains reachable on every replay until adopted. Elite ambushes after second guard; Nightmare alternates two marked ash-floor lanes. |
| 8 · Đền Nhật Thực / Eclipse Temple · 2250×1380 | Start (240,700). Break two pillars at (740,480) and (920,930), then enter open court (1650,690). Eclipse Warden rotates three phases: side lanes with safe center, ward adds to expose vulnerability, then a recorded sequence of lane → cleave → recovery. Clear all phases before exit (2060,700). Reuse Warden cues and body with an eclipse ring and contrasted palette. | An alcove at (1110,320) has materials, rejoins primary route. Elite guards one pillar with support; Nightmare introduces a marked sweep at the end of recovery, separated from the next attack. First clear awards a trophy and end-of-chapter view. |

Use existing enemy families as supporting waves. Add the following three tactical enemy IDs and use their supplied poses at arena scale; create simple shared animation timing. Define bounded attack ranges, target choice, collision and caps in data. Match earlier enemies' visual frequency and affordability. All routes must finish with base gear and no pet on Normal.

- **Bọ Khiên / Bulwark Beetle**: 150 HP, slow front guard within ~65° facing arc reduces frontal hero damage by 55%; side and rear take full damage. Guard visibly lowers for 0.85 s after a telegraphed charge. A food or ember pickup must never be covered by a permanent shield state.
- **Bướm Pháp Sư / Moth Shaman**: 78 HP, heal the nearest wounded normal ally for 12 HP after a 0.8 s green link cue, every 4 s, within 150 px. One target, never heal itself or a boss. Interruptible by lethal hit or leaving range. Cap two active.
- **Chuột Đào Hang / Ash Burrower**: 96 HP. One underground relocation, mark destination for at least 0.8 s before emerging; never pick an unreachable tile or overlap mandatory exit/chest. 14 radial damage if still standing in the marked area. Reappear fully targetable, cycle no sooner than 5 s. Dash and clear positioning beat the tell.

## Pets, care, and engravings

| Companion | Unlock | Behavior at bond 1 / 2 / 3 |
| --- | --- | --- |
| Cáo Lửa / Ember Fox | After first clear of Bell Orchard, claim as an adoption at camp. Historical stage-1 clear qualifies. | Every 5 s, attack nearest foe in 185 px for 18 damage; at bond 2 pierce one target; bond 3 pierce up to three targets with 22 damage. Cedar-red flame trail. |
| Cú Nguyệt / Moon Owl | First clear stage 6. | Every 8 s mark nearest elite/boss for +15% hero damage for 3 s; fall back to a normal enemy. At bond 2 duration 4 s, bond 3 cooldown 7 s. Nonstacking. Lavender wing ribbon and distinct crescent mark. |
| Rùa Rêu / Moss Turtle | Clear stage 7 after activating the rescue cage and reaching exit. | Single guard charge blocks up to 18 HP damage, refresh 14 s from spent. Bond 2 cap 24, bond 3 cap 30 and refresh 12 s. No stacking with self. Guard consumes only after dash grace and regular defenses have been resolved, once for a real incoming hit. |

Equip one, preview in a camp habitat with at-rest and action animations, name, role, bond and Feed/Equip controls. Feed costs 3 Treats to reach bond 2 and 6 more to reach 3. First story clear of stages 6–8 yields 3, 4 and 5 Treats respectively; first Elite clear of any stage yields 2; caches on new maps yield up to 2 per successful clear. Pet level increases survive reload; no timed hunger. Pet damage uses typed combat provenance and does not recursively trigger hero engraving effects or recharge itself. Cooldowns use simulation time, freeze in pause and draft and obey performance/telegraph settings.

Only owned +3 Ember, Prism and Warden lanterns can carry engravings. Unlock each engraving once for **3 Sigil Shards**; freely switch known engravings in camp. Award 3 shards on first Elite per stage, 4 on first Nightmare, 1 on Nightmare replay. One engraving per weapon. Damage uses confirmed hits and respects boss damage/windows. Put a visible internal cooldown where specified.

| Weapon | Engraving A | Engraving B |
| --- | --- | --- |
| Ember | Cinder Chain: a direct Wick Dart/Comet kill bursts within 52 px for 35% main-hit damage, once per 0.6 s. No recursive bursts. | Searing Brand: repeat direct hits on one marked enemy gain +16% hero damage for up to 2.5 s, direct hits refresh, no stacked copies. |
| Prism | Ricochet: once per 0.45 s a direct hit sends one shard at another target in 115 px within line of sight, 35% damage. | Refraction: Rank II splash gains 18 px radius and +10% splash damage. Respect the declared caps and preserve direct-hit exclusion. |
| Warden | Aftertoll: once per valid Burst, one delayed smaller pulse of 30% damage after 0.45 s at the actual previous location. No recursive cast or charge. | Shelter Bell: successful Burst grants 12 guard HP for 3 s, max one contribution, no damage recharge from guard. |

Use original silhouettes, bounded trails, rare-drop cue and pickup readability. Material rewards require a completed attempt, may be claimed once per first clear, and apply on confirmed exit. Display the reward source in selection and result panels. Existing gear and wallet remain the route for base Campaign upgrades.

## Vietnamese and English

Centralize locale tables as game-local typed dictionaries, with complete key parity and plural/number formatting. Existing users retain English if they have not chosen a language; new users can choose before starting. Persist vi or en and apply immediately when changing language in settings/camp. Translate visible old and new menus, objective/HUD, errors/actions, captions, gear, pet and boss details, settings, accessibility names and guidance. Preserve locale-neutral IDs for storage, links and tests. Keep fonts with Vietnamese accents, allow wrapping and long labels. Use the Vietnamese/English names in this brief, not raw internal IDs. Actual translated phrases are required in gameplay. No network localization dependency.
