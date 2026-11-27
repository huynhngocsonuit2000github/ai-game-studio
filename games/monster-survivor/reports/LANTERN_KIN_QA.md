# Monster Survivor Lantern Kin QA

Pack `monster-survivor-lantern-kin-v1`. Pinned and inspected GitHub main `2fef3a8e97ae219767bad273bd67ea6724408306`. The trusted validator accepted the exact SHA-256 `f157558597491eb867bd1c9ce0834cc683de5bc6a0f2727a17deecd7961185e8`, nine additions, zero replacements and six cleared WebP sprites. The independent approval is **LKN-AP01 — Producer external handoff prompt**. [Original brief](../production/features/ms-lantern-kin-v1/BRIEF.md) · [Sprite mapping and rights](../production/features/ms-lantern-kin-v1/ASSET_RIGHTS.md).

## LKN-10 and LKN-20

| Requirement | Result | Evidence |
| --- | --- | --- |
| Separate, versioned expansion and language state | PASS | Old Campaign reads its existing five Normal clear IDs, wallet and gear. Expansion and higher tiers commit only to the Kin key after confirmed exit. Tests cover duplicate IDs, stale feed quotes, repeated engraving selection, future and corrupt bytes and denied storage. [Save tests](../tests/kin.test.ts) |
| Stages 6–8 and end of chapter | PASS in deterministic simulation | Starter gear, zero pets and zero engravings cleared all three maps. Both mine guard orders, cage and supply paths, all three Eclipse phases and exit confirmation were exercised. [Route and assertions](../tests/kin.test.ts) |
| Eight maps with tier unlocks | PASS in simulation | Earlier Normal objectives and tuning remain the same. Each advanced route has an authored pressure phase and stand-alone timer. Representative base-kit clears include Bell Orchard Elite and Nightmare and Eclipse Temple Nightmare. [Difficulty data](../src/kin-difficulty.ts) · [Tests](../tests/kin.test.ts) |
| Three tactical enemies | PASS in simulation | Tests exercise the beetle's facing and recovery, the shaman's warning and heal, and a burrow dodge. Spawn caps and attack ranges are bounded by the campaign configuration. [Combat tests](../tests/kin.test.ts) |
| Companions, care and engravings | PASS in simulation | Fox provenance and charge isolation, Owl targeting and buff, Turtle after dash grace, all six engraving effects, first-only rewards and a reload are covered. [Combat and records tests](../tests/kin.test.ts) |
| VI and EN | PASS in unit checks and the emulated landscape smoke | Every authored stage, objective, gear, enemy and spell has a Vietnamese entry. Templates retain their placeholder sets. The landscape check switches both ways, fits the camp and launches Survival. [Locale dictionary](../src/locale-vi.ts) · [Browser test](../tests/kin.spec.ts) |

The three Normal base-gear simulation clears with seed 1807 took 171.88 s, 204.60 s and 206.58 s. The optimized routes came in below the 4–7 minute design target. A human pacing playtest and physical Android/iOS remain open. The tests also observed an Ash Mine seed where the automated route stalled at the north approach. The browser driver selects a deterministic route that clears with the current kit. Seed selection is confined to the browser test.

## LKN-30 assembled Pages

Runtime source `95a9f5fc0a10f9ee5a00be0b784ea4650d414dec`. Chromium 156 at 1366×768 and emulated landscape at 844×390. The browser driver advances the fixed clock and submits ordinary keyboard events and draft choices to the built game. All three chapter clears used starter gear with no equipped pet. The historical save remained byte-identical after progression, and a fresh save kept Mistwood locked.

| Check | Result |
| --- | --- |
| Frozen install, root lint, root typecheck, root tests, pack validator tests | PASS |
| Monster Survivor typecheck and 36 game tests | PASS |
| Catalog assembled with all three public games, Pages verification and project-subpath portal suites | PASS. Nine portal tests cover known and unknown entries, direct entry and returns, including Mỏ Vàng Náo Loạn. |
| Monster Survivor browser suite | PASS. Nine checks cover the original campaign, Survival, forge, stage 6–8 progression, VI dialogs and HUD, pet adoption, feed, equip and reload, Elite and Nightmare, earning and spending shards, and landscape touch. Zero HTTP or page errors in the story pass. |
| Mỏ Vàng Náo Loạn browser suite | PASS. Nine checks including the mine, shop, saves, touch and replay. |
| Trusted changed-path scope and adopted state validator | PASS. Every changed path is under the Monster Survivor game directory. |
| Forest Adventure browser suite | PASS. Eight checks including full campaign and save handling. |
| Rollback rehearsal | PASS. Served the actual candidate and pinned artifacts on the same Chromium origin in sequence. The baseline loaded five Campaign stages, legacy equipment and wallet, and Survival. Returning to the candidate restored Vietnamese and the expansion unlock. All four storage values matched byte for byte. |
| Hosted Pages | Pending manual merge and workflow deploy. The baseline marker request from the execution environment returned an HTTP 403 from the connection proxy. |

### Captured gameplay

| Capture | Observed play |
| --- | --- |
| [Mistwood waymark](evidence/lantern-kin/mistwood-normal-waymark.webp) · [Fog Keeper](evidence/lantern-kin/mistwood-normal-fog-keeper-1.webp) | VI HUD, lighting and cone tell. The exit was confirmed at 02:51.88 with 112 HP. |
| [Ember Fox habitat](evidence/lantern-kin/habitat-vi-ember-fox.webp) | Adopted after historical Bell Orchard clear, fed to bond 2, equipped, then checked again after browser reload. |
| [Ash Mine rescue](evidence/lantern-kin/ash-mine-normal-side-trip.webp) · [Furnace Overseer](evidence/lantern-kin/ash-mine-normal-furnace-overseer-1.webp) | Both guard encounters, rescue cage and furnace lanes. Exit at 02:50.43 unlocked Moss Turtle. |
| [Eclipse lanes](evidence/lantern-kin/eclipse-temple-normal-eclipse-warden-1.webp) · [Ward adds](evidence/lantern-kin/eclipse-temple-normal-ward-guard.webp) · [Final sequence](evidence/lantern-kin/eclipse-temple-normal-eclipse-warden-3.webp) · [Victory](evidence/lantern-kin/eclipse-temple-victory-vi.webp) | All three phases and exit at 03:34.15 with 93 HP. Trophy appeared in the VI result. |
| [Cinder Chain active](evidence/lantern-kin/bell-orchard-nightmare-engraving.webp) · [Nightmare hazard](evidence/lantern-kin/bell-orchard-nightmare-nightmare.webp) | Earned the first Elite shards on Bell Orchard at 02:19.18 with Ember +3. Learned Cinder Chain in camp, then cleared Nightmare at 02:40.73 with the same armor and weapon rank. |

[Story timeline, seeds and peak foe counts](evidence/lantern-kin/lantern-kin-timelines.json) · [Tier timelines](evidence/lantern-kin/lantern-kin-tier-timelines.json). Five other engraving effects and the Owl and Turtle behaviors were exercised in simulation.

Candidate acceptance is open for the Producer. Keep merge manual. After deploy, compare `build-sha.txt` against the verified deployment SHA, launch Campaign and Survival at the existing Monster Survivor route, and confirm the three catalog links. If rollback is required, revert only the Lantern Kin pull request and re-run the public smoke. The extra save keys remain available if the feature is restored.
