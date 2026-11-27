# Integration and acceptance

One batch **Monster Survivor Lantern Kin**, LKN-10 through LKN-30. Internal technical checks in order. Intermediate Producer reviews deferred by the external prompt. One game-only PR. Preserve original stage evidence, current Pages path, registry, other games and dependencies. Use existing project-subpath, browser, low-detail and reduced-motion contracts.

| Checkpoint | Outcome |
| --- | --- |
| LKN-10 | Integrate typed locale, settings, expansion state, difficulty and save compatibility. |
| LKN-20 | All 3 maps, 3 tactical foes, 3 pets and care, 6 engravings and map-specific difficulty variations across 8 stages. Integrate sprites and full-locale text. First complete loop, then continue through chapter victory. |
| LKN-30 | Verify assembled Pages and evidence below. Complete fixes, update GAME_STATE/progress/QA and open one scoped PR. |

## Save and transactions

Maintain existing Campaign and Survival storage. Independent versioned key ai-game-studio:monster-survivor:lantern-kin:v1 stores unlocks for stages 6–8, tier records, materials, owned/equipped pets and bond, learned/equipped engravings and one-time claim/attempt IDs. Use current game locking/transaction pattern. Treat saved old clears, owned lanterns and rank as inputs. Stage 1–5 Normal uses ordinary settlement. Fox adoption is a separate idempotent claim derived from existing stage 1 clear. New stages and harder replays settle expansion rewards into their single store. No cross-key transaction. Treats, shards, adoption, rescue and progression settle together after confirmed exit. Defeat and abandonment receive no expansion rewards. Handle concurrent input, corruption, storage denial and future schemas. Rollback leaves new state and locale keys dormant, with the original readers working.

## Required tests

- Start from old stage-5 cleared and fresh saves; progression, Normal through 6–8 and final victory, both Ash Mine guard orders and cage replay. No pet or rune prerequisite for a viable first Normal clear. Test old stage unlocks and intact wallet/gear, Survival and prior settings.
- Clear representative old/new stages in Elite and Nightmare. Validate all stage/tier data and track same-loadout pressure, actual timelines and safe visual cues; verify new foes' tells, tactical counters and performance caps on desktop and emulated landscape.
- Adopt Fox, unlock Owl, rescue Turtle; feed, equip, reload, progress each pet and visibly exercise all three behaviors. Verify one-time rewards and no duplicate grants on restart/double click/concurrent tabs. Earn a rune at +3 and demonstrate all six effects and switching with no recursive combat or repeated debit.
- Change VI/EN during play flow, persist on reload, and verify localized old/new screens, inventory, HUD, instructions, accessibility and result. Test key parity, Vietnamese accents, no cut-off text at 1366×768 and 844×390, and keyboard/touch.
- Use real Pages assembly with current registry; check all public games (including Mỏ Vàng Náo Loạn), entrance and return, Survival, old saves, new icons and no asset failures. Run trusted scope, frozen install, lint/types, unit, Pages assembly/state validation and relevant browser CI. Record exact SHAs, actual results, bugs and missing physical-device checks. Attach clips or actual gameplay frame sets for new stage, habitat, VI HUD and engraving in combat. Test rollback.
- Keep one manual merge. After merge and CI deploy, verify published SHA, launch Expansion and Survival and smoke-test catalog links. Record outcomes and Producer acceptance separately. Rollback by scoped revert; preserve live entry and all existing saves.
