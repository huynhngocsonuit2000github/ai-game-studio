# Monster Survivor checkpoint

Pack `monster-survivor-production-v1` · design and assets staged for handoff. See [GAME_STATE.json](GAME_STATE.json) for observed repository/deployment baseline and feature state. No implementation commit or PR exists. [Pack checks](../reports/PACK_CHECKS.md) record media and import validation. Exact archive hash comes from the separately pasted prompt.

**First task:** MS-000. Confirm archive bytes, Producer authorization, current repository context and validator staging. Then run MS Vertical Slice S00–S03 in order under actual approval. Write measured evidence as each stage completes. G2 Producer approval needed before S04. Record authorizing prompt, archive digest, current base and candidate changes in this checkpoint. Keep the repository's existing records authoritative after import.

**Publication:** Game Library registration needs Studio review. Public Pages pending. Public-repo receipt requires actual external prompt scope, even while Pages remains pending. No platform-side authorization assumed.

## S00 · MS-000 · accepted at G0

- MS-AP01 — Producer external handoff prompt, 2026-11-27. Approves the design at G0, all exact payload destinations, no replacements, and public repository import of the supplied assets. Runs MS Vertical Slice S00–S03, deferring S01 and S02 Producer reviews only.
- Baseline and pack reference both `f46ee26e4c0402dcd3d9c84504380af27c48e644`. Target tree and registry ID absent. Additive pack with no pinned checkout SHA in its envelope.
- T01 PASS. Trusted validator exit 0, isolated before tree empty, after tree matched the digest-bound approval. Receipt records baseline, external approval and file hashes. ZIP SHA-256 `af497a784662693c39d2bd4e726d1903db1e67ee1f72aa421761f68da7968696`. Trusted validator unit suite passed. No missing assets or replaced destinations.
- Source synthesis retained as authorized source material. Runtime uses exported media. Next MS-110.

## S01 · MS-110 / MS-120 · internally verified

- Strict typecheck and independent Vite build passed. Frozen installation succeeded and added only a disposable empty workspace importer in the local lockfile.
- T02–T05 slice prototype PASS. Five Node tests covered authored records, normalized diagonals, swept dash, cooldown, seeded 30/60/120 Hz steps, spawn cap, locked scarab windup, Wick Dart hits, embers, XP overflow and frozen drafts. Chromium 156 at 1366×768 loaded the production preview at the project subpath. Normal keyboard actions moved and dashed, pause froze the timer, and the first draft opened at 00:37 and accepted a number key. Zero observed page or HTTP errors. The browser test drove the existing animation clock externally.
- S01 Producer review deferred by MS-AP01. Next MS-210.

## S02 · MS-210 / MS-220 · G1 technically verified

- T06–T10/T12 slice subset PASS. Eleven gameplay/data/storage tests passed. Chromium 156, 1366×768, played the authored timeline through normal input with a deterministic test clock and seed. Orchard charge, Hearth, Thornback chest and Comet Thread were reached. Warden victory at 04:03.78 with 434 kills and 110 HP. An idle retry took HP defeat. Retry reset HUD and simulation. Two runs and one win were saved. Zero page or HTTP faults on the passing run.
- An initial retry exposed stale renderer effects when the fixture reissued a seed. Renderer now clears effects based on run identity. Same-seed retry passed.
- S02 Producer review deferred by MS-AP01. Next MS-310.

## S03 · MS-310 / MS-320 · candidate_ready at G2

- Implemented the 04:00–05:30 slice with the supplied atlases, key artwork and original WAV exports, responsive HUD and draft cards, settings, Web Audio, touch movement and dash, portrait pause, results and local storage.
- Latest inspected main `c790f520f96f6702fc2014f1c1524d2b01f341fa` adopted Studio V5.2 during QA. Revalidated the original ZIP against the same digest and external scope on a clean checkout of that revision. The registry and target were still absent. Candidate runtime rebuilt byte-for-byte after rebasing. The updated state conforms to Studio V5.2.
- Tested runtime source `19d642819558d9c150b2eb40f77ba8e23e3f7b38`, rebased source `49f0bbca7f4b1d8e566280dd3218284d7b45501d`. Exact checks and nine Chromium captures are in the [QA report](../reports/QA_REPORT.md). Authored-paced clear 04:03.78 with 434 kills and Comet Thread. HP defeat and same-session retry passed. Touch passed in Chromium emulation.
- The canonical Pages build and Forest Adventure regression passed, including the full public campaign and save migration. The candidate has its own local project-subpath preview and independent static build. Shared desktop preview access was blocked by the environment.
- Producer playtest and acceptance pending at G2. Next authorized work after approval is MS-410. S04–S06 remain pending. Registry and Pages approval are separate. Keep merge manual.
- Review is open in [PR #24](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/24) on `prod/monster-survivor/vertical-slice`. The verified gameplay evidence is committed at `17c2eab978002ebe6a859cc553fc3632e89edd05`.

## Monster Survivor First Release · S04–S06

- G2 accepted for the live S03 preview on 2026-11-27. Both intermediate Producer reviews deferred under the named batch. G4 playtest, release, catalog changes and merge remain pending.
- Intake baseline `ff54db3` includes S03, publication registration, and both Studio verification repairs. Approved scope is this game directory. Starting MS-410 and MS-420.

### S04 · MS-410 / MS-420 · technical PASS

- Normal starts from the production title. Verified all four recipes, two distinct rites and a disabled third ward, unique boons, Overrun, all normal foes and elites, and all three Warden phases. Field Guide, records and Dawn Scarf use the existing v1 save contract.
- Twenty simulation and persistence checks passed. The built production game cleared a full seeded run on Chromium at 12:11.10 with 1,780 kills. Two rites, Comet Thread, Crown of Glass, all Warden phases, retry and the existing S03 save passed with zero observed game or HTTP errors. The browser clock advanced the full authored schedule using keyboard and menu events.
- G3 content verification passed for the exercised scope. G4 human playtest remains open under the named batch. Baseline level 39 and an 11.1-second duel exceeded the progression and damage targets. S05 starts with that measured balance gap.
