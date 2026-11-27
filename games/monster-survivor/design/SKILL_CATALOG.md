# Skill catalog

[skills.json](data/skills.json) is the import-ready catalog. Each array entry supplies ordered ranks (R1 from index 0), icon ID, behavior, synergy, and visual plus audio direction. Use camel-case quantities verbatim in the data adapter. The dashboard card shows the delta from the current row to the next row and identifies its unlock recipe. Never show an evolution as an ordinary rank card.

| Family | Spell | Draft identity |
| --- | --- | --- |
| Projectile | Wick Dart | Starter, automatic Fan, Sparked marks and pierce |
| Orbit | Prism Ring | Continuous moving blades, consumes Sparked marks |
| Damage over time | Bog Bloom | Leaves poisoning gardens for crowd control |
| Summon | Foxfire | Staggered fox familiar shots |
| Area | Hex Bell | Position-centered knockback pulse, poison payoff |
| Shield | Mirror Ward | Blocks damage and bursts on guard break |
| Burst | Starfall | Telegraphs a heavy strike where mobs cluster |
| Dash | Innate movement action | Timing and positioning. Upgrade with Gale Laces and Lantern Pack. Outside the 16 draft/evolution records. |

Passives are Thread Lens, Lantern Oil, Root Charm, Gale Laces and Heart Husk (all R1–R3). Active spells reach R5. The four R1 evolutions replace the source spell and keep the same slot. See [progression](PROGRESSION_BALANCE.md) for the exact queue, triggers, status math and slot rules.

| Named build | Advance this spell | Paired passive | Transformation | Follow-up |
| --- | --- | --- | --- | --- |
| Comet | Wick Dart R5 | Thread Lens R2 | Comet Thread | Mark lines, then spend on Prism Ring or burst with Starfall |
| Glass | Prism Ring R5 | Lantern Oil R2 | Crown of Glass | Kite inside pulse range and fill gaps with Hex Bell |
| Midnight | Bog Bloom R5 | Root Charm R2 | Green Midnight | Slow and poison clustered enemies, then ring Hex Bell |
| Pack | Foxfire R5 | Gale Laces R2 | Lantern Pack | Choose Wind, dash through gaps for endpoint damage |

Keep cast, hit and status handling in distinct systems. UI must show why the player got a new effect, who owns damage and whether the next reward is a recipe or a normal rank increase. Run end lists every equipped item, evolution and damage contributed per family.
