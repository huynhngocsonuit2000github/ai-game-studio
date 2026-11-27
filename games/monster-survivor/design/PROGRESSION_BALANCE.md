# Progression and balance

Numeric authority is [skills.json](data/skills.json), [rules.json](data/rules.json), [enemies.json](data/enemies.json) and [waves.json](data/waves.json). Treat initial tuning as a hypothesis. Changes after slice review need before/after seeded results and a decision entry.

## Drafts, slots and synergies

- Start at L1 with Wick Dart R1. XP to next level = `18 + 5n + floor(0.32n²)`, where n = current level − 1. Carry overflow. Give one choice event per level. Recompute legal candidates after every choice, never grant a rank above cap or duplicate a card. XP pickups are additive and deterministic. Start with 68 px pickup radius.
- Cards may learn spells (max 4 slots total), learn passives (max 3), or raise owned ranks. Weighted draw without replacement per draft: owned upgrades 4, unowned spells 3, unowned passives 2. L2 forces at least one new spell; L3–L5 force at least one owned upgrade where legal and one new item where legal. Sort by stable ID before sampling with the draft RNG. Use current rank and data to show exact delta and combo badge.
- Once at least two draft selections complete, offer one reroll per run. The first reroll excludes the current options when enough candidates exist; otherwise fill from the previous pool. Reroll consumes the charge on valid submission, never on close or invalid input.
- If fewer than three candidates exist, show remaining legal upgrades plus distinct fallback cards chosen in order: Patch (+20 HP, hidden at full), Haste (−0.35 s from next dash cooldown remaining, repeatable), Wick Oil (+3% total outgoing damage per fallback, capped +15%). If legal cards exhaust, offer Skip (explicit no-op) so an empty modal never blocks input.
- Evolution requires its active R5, paired passive R2 or better and a catalyst from a defeated elite. A chest adds one banked catalyst automatically when picked up. After any chest pickup or rank commit, if a recipe becomes eligible, enqueue a paused evolution picker after that selection and before the next XP draft. Show eligible recipes and Later. Later suppresses only the current eligibility snapshot until ranks/catalyst count change. Spend one catalyst on confirm, replace the original slot, and keep its damage attribution family. Recheck eligibility on event commit. No loss of resources on duplicate input.
- Ward boons: Hearth heals 24 immediately and increases max HP by 10 for the run (+10 current HP). Wind adds 0.45 s dash cooldown reduction and +8% move speed. Gather increases pickup radius by a flat 55 px and grants +10% XP (carry fractional XP). They do not consume passive slots. Dash cooldown minimum 1.6 s. Player move speed capped at +35%. Spell cooldown floor 0.25 s.
- Sparked (Wick Dart) lasts 3 s, one mark per target, refreshes on hit; the next Prism Ring hit consumes it for +9 base damage. Spores (Bog Bloom) refresh the higher-power poison for up to 4 s, never stack per target. Hex Bell hitting a poisoned target adds +35% base damage once per cast per target. Starfall hitting a Sparked target adds +25% base damage and leaves its mark for Prism. Modifiers are multiplicative unless specified. Resolve mark/consume effects in queue order. Owner ID tracks kill source for the recap.
- Potions drop at every 45th normal kill (one at a time, despawn after 20 s) and add 18 HP on pickup only below full. XP gems never despawn by age. At cap, merge closest same-cell value, or route overflow to a deterministic nearby existing gem. Chest pickup uses 28 px and no auto-teleport. The boss grants no post-terminal reward modal.
- Win unlocks `dawn-scarf` cosmetic. Persist selected look, best time cleared, highest wave time, run/win count, record kills and discovered skills/evolutions. Every run is mechanically fresh. No currency shop. Retry generates a new seed; developer-only seeded scenarios are a test feature.

## Balance targets

| Check | Expected band on Normal with ordinary inputs |
| --- | --- |
| First level | 18–40 s, first draft usable immediately |
| First ward | 02:00–04:30 on a player-selected route |
| First elite | Drops a reachable catalyst before 05:30 |
| Second rite | 06:00–10:45 on first successful runs |
| First evolution | 06:00–10:30 for a player who intentionally builds a pair |
| Level at 12:00 | 14–19, enough draft turns to mix breadth and depth |
| Boss combat | 55–120 s typical after summon, health thresholds visible |
| Diversity | Four recipes reachable and viable. Demonstrate at least three distinct builds in real normal runs; prove fourth with seeded integration and human playtest before release. |

Use seeded 04:00, 08:00 and final-wave captures. Log actual kills/s, XP gained, selected ranks, HP loss by source, spawns skipped, and spell damage per elapsed minute. Maintain sufficient XP after density caps; tune rate and XP independently of on-screen clutter. Remove power from a dominant status combo before inflating every enemy's HP.
