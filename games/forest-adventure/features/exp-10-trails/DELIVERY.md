# Delivery · EXP-10-TRAILS

Pinned repository observation **ea96679a42732a3a260fa4d77b35c6a2ac8bd115** in huynhngocsonuit2000github/ai-game-studio. Reconcile with current main before applying. The registry at that commit identifies Forest Adventure as 0.1.0 In Development. Initial production and release gates remain part of the existing game's checkpoint. This expansion does not promote the live catalog.

## One coherent feature PR

1. Stage and verify this manifest and layouts. Read the current master and game AGENTS.md, then preserve the legacy campaign, existing art and saves. Import under games/forest-adventure/features/exp-10-trails/.
2. Build the preview variant with the existing renderer and route. Start locally with 01–03 to verify data import and chapter progression. Only after baseline and three-stage playthrough checks pass, integrate 04–10 in the same branch. Use the existing navigation/results flow. Add a minimal New Trails entry only if required to preserve the existing ending and give access to the chapter.
3. Add game-local deterministic and browser regression coverage for the whole addition. Produce one playable candidate and exact SHA. Stop after opening/updating the single feature PR for Producer playtest. Public preview and release still require explicit authorization and existing Studio checks.

## Compatibility and scope

- Keep production mode unchanged until public approval. Use a local preview mode/output that cannot be activated by a public query parameter or a saved flag in a default build. Check that the default Pages artifact excludes expansion level imports and preview controls. Keep paths relative to the existing Pages prefix and retain Back to Studio.
- Reuse approved local Fernlight palettes, props and sound variants. No new art, audio, enemies, controls, streaming services or dependencies. Existing public media rights still have their original scope. Any public expansion publication is a separate Producer decision.
- Treat TRAIL_LAYOUTS.json as new data. Map numeric rectangles and patrols via the established level parser or a precise shared adapter. Do not fork simulation. Keep the original layout file, IDs and geometry unchanged. Before migration, prove collisions and all optional pickups from the included input traces in the current code at the exact candidate SHA.
- Keep forest-adventure:save:v1 untouched by an expansion preview. Use an isolated key such as forest-adventure:exp-10-trails:preview:v1. On first open, seed from valid classic settings, unlock prefix and records read from legacy bytes. An existing valid clear record for lantern-oak unlocks trail-01 once. Merely unlocking Lantern Oak does not unlock the chapter. New trails unlock sequentially after first clear. Replay updates independent best time and firefly records under their own IDs. Released migration is a separate explicitly approved step and preserves the old key for rollback.
- Retain the existing target device and budgets. Menu ≤3 s on 10 Mbps and 100 ms RTT, initial transfer ≤6 MB, total runtime ≤18 MB, p95 frame ≤20 ms and JS heap ≤120 MiB on the representative laptop. Load only the assets and data needed by the selected mode and reuse shared textures.

## Acceptance

| ID | Check |
| --- | --- |
| X10-1 | Run game-local typecheck, unit, browser and legacy campaign commands on baseline and candidate. The three legacy levels use the same IDs, maps and public entry. Legacy save bytes stay unchanged after preview. |
| X10-2 | Run actual Session.step with ten reference inputs, assert three seeds, eight fireflies, portal clear and no deaths. Then complete a real keyboard/browser clear for each new level, collect its three seeds, and check the last gate and completion screen. |
| X10-3 | Test migration from no progress, incomplete legacy, completed legacy, corrupt or unavailable storage. Verify restart, checkpoint, pause, Next/Continue, replay and reload. Unlock happens once and no level can be skipped through a locked selection. Test final result from trail-10. |
| X10-4 | Launch at the real Studio project subpath and inspect both standard and preview build outputs, cover/asset paths, Back to Studio and console/network. Compare production visibility and output against baseline. Record a private or local playable preview when public approval is pending. |
| X10-5 | Producer plays the exact candidate and checks that levels 02, 06 and 08 ask for visibly different route decisions. Capture labels and screenshots. Review any difficulty spike from first-run deaths and distinguish observed from untested. Pass the release requirements separately before any public deployment. |

## Checkpoint

Design/geometry candidate verified against the pinned Session. Import, browser, visual checks and Producer playtest are pending. No expansion commit, PR or published build yet. Next action is the submitted Codex Cloud handoff. Record pack ID, base/head SHA, playable preview, test status, defects and next eligible action under this feature and append to the game production checkpoint without overwriting earlier production history.
