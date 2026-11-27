# Monster Survivor Campaign Polish QA

The trusted Studio validator checked pack `monster-survivor-campaign-polish-1` against clean `1dc171a729dd958c686583061aecbf8bfffda2b5`. The checked ZIP SHA-256 is `d462b183434fc16a2386c022711bd83e8bf2e2a878af9480fe5c3f53ebe596c9`. The receipt lists six digest-matched additions and zero replacements. GitHub main matched at intake. **MSCP-AP01 — Producer external handoff prompt** clears the four supplied WebPs for the public repository and the existing Pages preview after manual merge. [Design brief](../production/features/ms-campaign-polish-1/BRIEF.md) · [Rights record](../production/features/ms-campaign-polish-1/ASSET_RIGHTS.md).

## Pacing comparison

Times are gameplay seconds measured from stage entry through confirmed exit. Drafts and menus freeze the game clock. The comparison uses seed 1807 and matching gear for each stage. The driver still prefers nearby gear and healing, engages the current objective, and uses the same stage-specific draft priorities. It now picks attack positions with clear sight lines, follows wall detours, dodges poison lanes and aims at guarding enemies during a shielded Warden phase. It collects nearby loot before confirming an exit. The after route took the Flooded Causeway and cleared both Thorn Gate branches.

| Stage | Before | After | Ratio | Kills before / after | Damage taken before / after | Peak foes before / after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Bell Orchard | 42.62 s | 125.22 s | 2.94× | 68 / 480 | 12 / 31 | 20 / 29 |
| Venom Marsh | 48.42 s | 133.42 s | 2.76× | 57 / 407 | 80 / 14 | 21 / 30 |
| Candle Crypt | 39.02 s | 120.42 s | 3.09× | 64 / 402 | 20 / 54 | 28 / 34 |
| Thorn Gate | 53.02 s | 155.42 s | 2.93× | 21 / 434 | 41 / 97 | 8 / 35 |
| Hollow Belltower | 103.42 s | 290.62 s | 2.81× | 72 / 892 | 17 / 56 | 46 / 44 |

Bell Orchard was fresh. Venom Marsh used Ember Lantern +1, Patchcoat +0 and Amber Charm +0. Candle Crypt added Marsh Boots +0. Thorn Gate and Belltower used Ember Lantern +2, Patchcoat +2, Marsh Boots +0 and Bell Charm +0. Peak simultaneous enemies and total damage are separate measurements. Marsh took less damage on the scripted route with lane avoidance and better line-of-sight positioning. Belltower sustained more combat, while its peak was slightly lower. Thorn Gate’s peak increased from a sparse two-hunt baseline. These fixtures establish a longer clear and more encounters. Human pacing and difficulty feedback remain open. [Shipped baseline QA](CAMPAIGN_QA.md).

Starting Wick Dart retains 20 damage and a 0.60 s fire interval. The Orchard first draft opened at 2.87 s and the seed banked 123 gold on first clear. The first upgrade costs 35 gold. The kill-gold caps, chest values, legacy first-clear awards and duplicate-item conversion stay in force. Repeat Orchard clears use the same capped enemy rewards and chest pool. Later unlocks continue to require completion of the preceding stages.

## Acceptance and build evidence

| Area | Evidence |
| --- | --- |
| MSCP-10 pacing and challenge | Five three-phase routes and confirmed exits. Orchard flank packs and two Thornback charge timings. Either Marsh crossing is selectable and the route alternates horizontal and vertical poison lanes. Two Crypt assaults approach from different directions, with a recovery pickup between them. Both Thorn Gate keys precede the gate ambush. Belltower phases two and three have guard breaks, with a sequential lane-to-cleave combination in phase three. The first four safety limits are 08:00 and Belltower has 12:00. |
| MSCP-20 Armory and Forge | Stage map and Armory are separate views. The inventory, portrait showcase, test projectile, Forge rank path, exact bonuses, costs and wallet use the current save data. The confirmation rechecks expected rank and funds under the existing transaction. The strike and sparks are decorative. Browser coverage includes stale and duplicate activation, reduced-motion handling in CSS, equipped, empty, insufficient, maximum and success states. |
| MSCP-20 Art and VFX | All four supplied 384×384 RGBA WebPs decode with transparent margins and ship as fingerprinted relative assets. Portraits are reused in the inventory, showcase and carried lantern. Brass, split flame, violet facets and pale toll motifs remain distinct in combat. Campaign collision, damage and RNG are independent from weapon rendering. |
| MSCP-30 Regression | The Campaign sequence starts fresh, verifies older Survival save bytes and the Campaign schema, upgrades, reloads, and confirms all five exits. Unit checks cover reward settlement, gold cap, either Marsh crossing, Crypt recovery and deadlines. The existing assembled wrappers verify Forest Adventure, Survival, and the library routes. |
| Live | The pinned revision had its marker and both existing entry routes verified by the [prior hosted deployment job](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/45955280202/job/140361494930). Direct public gameplay was blocked by the cloud internet allowlist. This candidate needs a manual merge and post-deployment live verification. |

Using the same seed 1271, Prism Lantern +2, 1366×768 Chromium viewport and 2× device scale, the 252-frame sample reached 23 simultaneous foes before and 35 after. Both builds measured median 59.9 FPS. Before and after p95 intervals were 16.7 ms in normal detail and 16.8 ms in Low Detail. Normal and Low Detail ended the after sample with the same HP, HUD and damage. The capture begins at the first eligible dense Prism hit in each build. A physical-device benchmark and human playtest remain open.

Browser results and frame timing appear in the existing Actions `browser-evidence` artifact. The capture set includes Orchard loot, Ember hits and Marsh lanes, Crypt defense, Thorn Gate, three Warden phases, the +3 Warden Lantern hit, both Prism detail modes, and the desktop and landscape-touch Forge. Production entry and return routes use the canonical project subpath.

Rollback uses a scoped revert to the pinned preview, preserving both public entry paths. Campaign and Survival retain their existing v1 keys, unlocked stages, item IDs, rank cap and equipment slots. Keep merge manual. Producer playtest remains pending.
