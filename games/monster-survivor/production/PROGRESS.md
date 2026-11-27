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

### S05 · MS-510 · desktop technical PASS, device coverage open

- Tuned Normal ember value and Warden recovery windows. Compared with the S04 seed, the wave-end level moved from 39 to 21 and the duel from 11.1 s to 28.85 s. Four different evolution builds cleared seeded runs. Two stronger builds still beat the 55-second duel target and wave-end levels land slightly above the 14–19 target. See the recorded runs and deviations in the [release QA](../reports/RELEASE_QA.md).
- Reused spatial buckets, cached the lantern glow, culled offscreen effects and added a persistent low-detail option. Complete Chromium replay cleared at 12:28.85 with 1,782 kills, old v1 save compatibility, all three boss phases and three clean restarts. Desktop/touch emulation, all settings, audio unlock/mute and atlas recovery passed.
- In the Chromium dense 90-second segment, median 59.9 FPS and p95 16.73 ms over 4,949 sampled frame intervals. Initial transfer 1,475,458 bytes, input ready in 1.74 s at 10 Mbps/150 ms, 3.11 MB dense JS heap, 23,796 bytes drift over three restarts. Local Chromium measurements passed the numeric targets for that environment.
- Firefox and WebKit installs were blocked by HTTP 403. Physical Android and iOS, representative desktop hardware, and human balance/audio review remain open. No device exception was granted. Seal available evidence and proceed with the independent S06 assembly and rollback checks. Release approval remains pending.

### S06 · MS-610 · G4 candidate

- Candidate assembled with the canonical registry at commit `ff54db362cc29e6e7f3796eaae04d695dbdd639c`. Both public game paths and the release manifest are preserved. Normal and Forest Adventure passed the assembled launch and return checks. See [release verification](RELEASE.md) for the test matrix, retry and rollback evidence.
- Rebuilt and tested the S03 rollback artifact independently. Forest Adventure’s output is identical. v1 preferences, results, discoveries and sibling save isolation survive the rollback. The optional Normal detail flag defaults safely if S03 rewrites the save.
- Candidate playtest archive uses the existing PR browser-evidence job. Runtime test evidence is tied to `04338c6ea786b5b46652c14cd82c1537b7d8b54e`. The G4 review documents the remaining device and balance coverage and the separate Released registry proposal.
- Stop at G4 for the Producer’s playtest and explicit approval. Merge remains manual. The live S03 route remains active pending that decision.

## Campaign v1 · MSC-10, MSC-20, MSC-30

The Producer approved the design, the exact ZIP with five additions and zero replacements, and the complete named batch with intermediate reviews deferred. The pack ID is `monster-survivor-campaign-v2`. ZIP SHA-256 `08ab02235596655e2a68ed40f137145b9a99cbc936fba1bc8a9e370126e44d06` passed the trusted validator on clean `85955db765164f52ea2cea2c4c0878321e81fc4c`. Inspected GitHub main matched the pinned baseline. [Brief](features/ms-campaign-v1/BRIEF.md) · [QA and evidence](../reports/CAMPAIGN_QA.md).

- **MSC-10** · Campaign entry, camp, first two stages, settlement and upgrade loop are playable. The assembled browser earned Ember Lantern, upgraded it, reloaded and completed Venom Marsh with the upgraded loadout.
- **MSC-20** · All five stages, 12 items, gold, drops, permanent upgrades, temporary pickups, Burst and weapon presentation are implemented. The assembled browser run unlocked each stage, defended the Crypt lantern and completed all three Warden phases. A matched Belltower encounter exercised both presentation settings.
- **MSC-30** · The Campaign and Survival suites ran against the assembled project-subpath artifact. The report records checks, playfeel and performance measurements, remaining device coverage and rollback. Scripted clears came in under the 3–5 minute playtest band. Producer playtest and approval remain pending. Merge stays manual. After the existing deployment completes, verify the public marker and launch Campaign and Survival at the existing route.

## Campaign Polish · MSCP-10, MSCP-20, MSCP-30

**MSCP-AP01 — Producer external handoff prompt** approved the design, six exact additions, zero replacements, portrait redistribution and the one batch with intermediate reviews deferred. The trusted validator confirmed ZIP SHA-256 `d462b183434fc16a2386c022711bd83e8bf2e2a878af9480fe5c3f53ebe596c9` for pack `monster-survivor-campaign-polish-1` on clean `1dc171a729dd958c686583061aecbf8bfffda2b5`. GitHub main matched the pinned revision. [Brief](features/ms-campaign-polish-1/BRIEF.md) · [Rights](features/ms-campaign-polish-1/ASSET_RIGHTS.md).

- **MSCP-10** · All five stage routes use three combat phases. The repeatable seeded comparison uses the same starter and upgraded gear in each respective stage. Short recovery between Crypt assaults provides a heart and restores some lantern health. Exits remain objective-gated and the kill-gold caps remain in force.
- **MSCP-20** · Stage map, Armory, and attached Forge use the existing wallet, gear IDs, equipment and storage transaction. Four portraits appear in the inventory and equip showcase and are carried by Wick in Campaign. Weapon variants retain the existing visual budgets and collisions.
- **MSCP-30** · Assembled Pages, saves, scope, playtime comparison and browser captures are tracked in the [Polish QA report](../reports/CAMPAIGN_POLISH_QA.md). Merge stays manual. Producer playtest and post-merge live verification remain pending.
