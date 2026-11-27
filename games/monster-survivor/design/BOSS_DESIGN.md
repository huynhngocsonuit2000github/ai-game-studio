# The Hollow Warden

A giant jade-and-indigo owl made of moss, with antlers and amber eyes. Body radius 52, speed 58, starting HP 4,800 on Normal. Warden spawn takes 1.5 s with an invulnerable invocations cue and no contact damage. Place on the open dais nearest the arena center, choosing the first empty precomputed spawn position at least 220 px from Wick. Panic is communicated by movement and ring tempos. No screen-filling flash.

| Phase | HP | Pattern rotation | Behavior |
| --- | --- | --- | --- |
| Sentinel | 100–66% | Cleave → Toll | Stalk while idle. Pause 0.85 s after each attack. |
| Briar | ≤66% | Toll → Lanes → Cleave | On threshold cancel pending attack, play 0.8 s stagger, clear existing boss hazards and add two Seedlings off the player. |
| Midnight | ≤33% | Lanes → Cleave → Toll | Same transition treatment, add two Moths, lower recovery to 0.60 s. Telegraph durations stay fixed. |

- **Cleave.** Anchor and lock a 100° wedge toward Wick at windup start. Pattern-striped orange wedge reaches 205 px. Telegraph 0.83 s, hit once for 19. Attack phase lasts 0.15 s, then recover. Walking around the owl or dashing perpendicular is safe.
- **Toll.** Telegraph expanding ring path and safe gap for 1.05 s. Active band outer edge expands at 145 px/s from radius 40 to 340; band width 26. Each of two rings in Midnight (second +0.65 s) has a 52° safe sector. Select sector from seeded cardinal offsets, but choose an open walkable escape route within 140 px of Wick. The ring can hit Wick once for 15. Recover after the final ring has left the reachable band or expired. Do not chain active rings into a lane pattern.
- **Lanes.** Three 52 px parallel strips, 74 px gaps, axis chosen using the boss RNG. Choose a valid layout with obvious safe corridor within 100 px of Wick. Telegraph 1.1 s, persist 0.40 s, first hit per cast deals 17. Use three prevalidated alternatives if the first overlaps blockers improperly.
- Contact damage 13 while active, shares Wick's damage grace. Boss moves during idle only. No body push that traps the player in a wall. DoT is allowed, strong crowd knockback has no boss effect. Chill reduces boss movement by up to 15%, never attack timing.
- At 14:45 on Normal, show `Final Toll in 0:45`. Boss recovery gets 15% shorter from that point; the telegraph durations and damage stay fixed. Player can still win an attack tick at exactly 15:30 using the outcome priority in GDD.
- Slice uses the same sprite, spawn and attack code, 660 HP, Sentinel and Briar only. Skip Lanes in Briar and spawn no adds for the slice. No separate enemy implementation.

**Evidence.** Capture HP thresholds, all three attack cues, recovery readability and both endings at gameplay scale. In seeded difficult layouts confirm path to at least one safe position on every cue. Verify simulated pause and 33%/66% crossed in one hit only trigger the deepest reached phase, once. Defeating the boss during a phase windup cancels its hazard and stops the run timer.
