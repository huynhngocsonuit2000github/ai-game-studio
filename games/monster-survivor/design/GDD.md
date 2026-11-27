# Monster Survivor

**Fantasy.** Wick, a black cat in a teal cloak and a red scarf, carries the last warm light into a garden of living bells. Every attack feels like a small spell the player can turn into a runaway chain reaction.

**Promise.** Steamroll a swarm with smart positioning and a build that visibly changes. Short sessions for browser players. One hero, one dense arena, one normal ruleset, plus a time-limited slice mode during production. Readable on keyboard and touch landscape. English UI with centralized strings.

## First release

- Bellgrave Garden, one 2,400 × 1,600 logical-pixel arena with three fixed landmarks and seeded decorative variation.
- Normal run with 12 minutes of waves, two of three ward rites, two named elites and one three-phase boss. Expect successful runs around 13–15 minutes. Hard limit 15:30.
- 7 auto-cast spells, 5 passive upgrades, 4 evolutions, innate dash, 3 shrine boons, one light cosmetic unlock and local match records. Four spell slots including the starter and three passive slots.
- 5 standard monsters, 2 elite variants, 1 boss. Normal gameplay includes victory, defeat, summary, retry and return. Release starts in title menu with Start Run, Field Guide, Settings and Game Library.
- Offline-friendly once loaded. Single player and local preferences. No account, persistent stat grind, multiplayer, resume-in-run, external services, paid dependencies or multiple maps for this version.

## Core loop

Move to pull a pack into a line, trigger an auto-cast, dash through a gap, return to collect embers, then draft one of three upgrades. Take a detour to a ward for a risky rite and a strategic boon. Decide whether to stand a few seconds in its circle or leave and return with space. Beat elites for evolution catalysts. Enter the final arena with two rites complete, read the Warden's cues and strike through the recovery windows.

**A mid-run minute.** During 04:20–05:20 Wick kites a beetle around the southern bell and catches its ranged escort with an orbit blade. A level-up offers a fourth damage rank, a pull-radius upgrade and a new DoT spell. Wick takes the DoT to mark a cluster, dashes across it, doubles back for the elite chest, and charges the nearby ward. When an enemy pushes Wick off the circle, rite progress waits five seconds before decaying. After the purge flash, the player chooses a ward boon and plans a route to the second ward.

| Input | Behavior |
| --- | --- |
| WASD / arrows | Camera-relative 8-way movement, normalized diagonal. 185 px/s baseline. |
| Space / touch dash | 180 px in 0.22 s, 3.2 s lockout from dash start, 0.22 s invulnerability. Start along input or last move vector, default down. Solid blockers stop and consume it. |
| Auto-cast | No aim required. Acquire deterministic nearest eligible target when relevant. Movement determines effective range and how spells overlap. |
| Esc / pause button | Freeze the simulation, stop run clock and hazard countdown. Focus loss triggers explicit pause. |
| 1 / 2 / 3 or arrows + Enter | Choose a visible upgrade/boon. Touch cards and mouse click select too. |

Wick has 100 HP, body radius 13, 0.7 s grace after actual HP damage. Contact, shots and telegraphs use one damage pipeline. A guard spends before HP loss, grants 0.25 s anti-double-hit grace, and never spends during a dash. A hit that deals zero HP never resets the longer damage grace. See progression for pickup and draft rules.

## Rites and endings

- Stand inside a ward's 90 px circle for 9 cumulative simulation seconds, with enemies still active. After leaving, carry progress for 5 s, then lose 0.5 charge seconds per second to zero. Charge only one ward at a time. Each ward completes once. Disable remaining ward after the second completion. Pointer and map route show nearest available ward.
- Completion knocks back nearby normal mobs 100 px, removes hostile projectiles within 160 px, grants 32 XP directly, and opens a paused choice of three boons. Each boon is one-per-run; display two choices at the second ward. Chests and XP drafts wait in a FIFO modal queue. Apply objective state first, then present the boon before XP drafts caused by that rite.
- Survive until 12:00 and finish two rites by 13:30 to summon the Warden. Base waves end at 12:00. If rites are incomplete, bounded Overrun waves last until the rites are completed or 13:30. The HUD shows the missing objective and countdown. Spawn the boss only once, then stop the director and clear remaining normal mobs and shots without awarding XP. Existing XP and chests remain outside the boss telegraph at their positions. Freeze rite progress as complete.
- Defeat the Warden before 15:30 to win. Reach zero HP, miss the rite deadline, or hit 15:30 with a living boss to lose. At any expiry tick, resolve same-tick combat first, then objective updates, then outcome. If Wick and Warden die on the same tick, defeat wins priority. Announce the specific result and offer Retry or Back.
- During onboarding, one brief prompt teaches movement and dash, then a banner points to the nearest ward after the first draft. Hints fade through simulation time and do not obscure hit markers. The slice applies a shortened authored schedule specified in [WAVES_AND_MAP.md](WAVES_AND_MAP.md).

## Experience and playtest

The four evolution pairings define long-range, orbit, hazard and summon builds. A dash can reposition an AoE, while guard and movement passives buy different kinds of safety. Each archetype must win a seeded normal run with ordinary inputs during balance review. Show the concrete build and its contribution at the end. Give three first-time players one run without coaching. Record initial comprehension, readability, meaningful choices and desire to replay. Producer decides the outcome at G2 and G4.
