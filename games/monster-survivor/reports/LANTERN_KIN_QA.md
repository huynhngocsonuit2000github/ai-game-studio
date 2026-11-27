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

| Check | Result |
| --- | --- |
| Frozen install, root lint, root typecheck, root tests, pack validator tests | PASS |
| Monster Survivor typecheck and 36 game tests | PASS |
| Catalog assembled with all three public games, Pages verification and project-subpath portal suites | PASS. Nine portal tests cover known and unknown entries, direct entry and returns, including Mỏ Vàng Náo Loạn. |
| Forest Adventure browser suite | PASS. Eight checks including full campaign and save handling. |
| Rollback rehearsal | PASS. Served the actual candidate and pinned artifacts on the same Chromium origin in sequence. The baseline loaded five Campaign stages, legacy equipment and wallet, and Survival. Returning to the candidate restored Vietnamese and the expansion unlock. All four storage values matched byte for byte. |
| Hosted Pages | Pending manual merge and workflow deploy. The baseline marker request from the execution environment returned an HTTP 403 from the connection proxy. |

Candidate acceptance is open for the Producer. Keep merge manual. After deploy, compare `build-sha.txt` against the verified deployment SHA, launch Campaign and Survival at the existing Monster Survivor route, and confirm the three catalog links. If rollback is required, revert only the Lantern Kin pull request and re-run the public smoke. The extra save keys remain available if the feature is restored.
