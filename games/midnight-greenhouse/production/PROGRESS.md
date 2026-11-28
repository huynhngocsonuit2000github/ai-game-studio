# Production checkpoint

Game `midnight-greenhouse` · Batch `GH-THREE-LEVELS` · Pack `midnight-greenhouse-gh-three-levels-v1`.

**S03 historical handoff / GH-30.** Technical G2 passed for Sân Mưa. Producer G2 acceptance is pending. Runtime candidate `5b34762f240f93e8b1b4892fd116430d9e7e3dea`, on `midnight-greenhouse/gh-three-levels` and [draft PR #35](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/35). This checkpoint adds evidence on that branch. The playable runtime is identical to the listed candidate.

Approved campaign scope is Sân Mưa, Hầm Bơm and Đài Chớp, six plants, five regular enemies and one boss. The current build opens Sân Mưa with its four starter plants and four enemy types. Both later encounters remain designed and gated. G0, repository asset rights and the pending G2/G4 and Pages decisions are in [DECISIONS.md](DECISIONS.md).

## S00 — GH-00 — Import

Trusted `origin/main` fetched and verified at `2fef3a8e97ae219767bad273bd67ea6724408306`, matching the preparing base. Exact game ID and folder were absent. The attached ZIP was received in full (7,455,687 bytes). SHA-256 `de9d9f0cdf4c9000680a3285dbeb064ede21d4b2a215b05f40160ba4c4af161b` matched the separately supplied approval. The trusted validator passed. Isolated before/after review found 54 additive destinations, zero replacements, no missing assets and no packaged executable configuration. The manifest, asset register and Producer approval agree on rights for the original supplied media. Raw ZIP, external approval and validator receipt are outside Git. Game AGENTS was created from the Studio template.

## S01 — GH-10 — Playable loop

G1 technical PASS. Strict TypeScript and Canvas 2D use the existing workspace tools. Deterministic 30 Hz wave simulation, 20-second prep, four lanes, calibrated layout coordinates and exact Sân Mưa timing. Card placement/removal, economy, cooldown, attacks, damage, victory, defeat and retry passed the [simulation and browser evidence](../reports/QA_REPORT.md#sân-mưa-candidate). No gameplay test controls are present in the built UI or data.

## S02 — GH-20 — Art and controls

PASS at desktop and touch-emulated minimum landscape viewports. Used the supplied raincourt painting, isolated sprites and aligned anchors, visible range and route previews, meaningful attack cues and Vietnamese HUD. Iterated on the compact placement of the threat forecast and reverified first and last valves and the outer tile. Portrait hint and settings remain operable. See [desktop](../reports/screenshots/s03-raincourt-desktop.webp) and [touch](../reports/screenshots/s03-raincourt-touch.webp) evidence.

## S03 — GH-30 — Technical G2

Two different openings cleared all six waves at normal speed with 3/3 Hạt Tim. Collector-first took 7:09.867 of combat with two stars. Two-Fern-first took 7:13.400 with three stars and a three-target wet Orchid chain. The no-defense run defeated the core and a normal Retry reset all transient gameplay. Browser reload retained the winning record and audio/motion settings. The packaged score, rain and delayed Orchid cue advanced with strict autoplay after a user gesture. The Web Audio repair is covered by the new browser regression test. Human audio and balance acceptance are pending. The original tuning is retained. Both clears could accumulate sizable stock after establishing several Ferns and collectors.

The exact-candidate trusted catalog preflight passed all 36 browser checks under the Pages project subpath, including temporary catalog launch, direct entry and portal return. The final scope check passed against refreshed main at `3d4624d018a4b69ec47a74bb042c887376b25e84`. The intervening change was confined to Monster Survivor. The packaging path produced and verified a 1.19 MiB standalone ZIP and records the exact candidate and tested checkout inside. The canonical release artifact excludes the game. There are no tracked shared, lockfile, registry, workflow or sibling-game changes. See [QA evidence](../reports/QA_REPORT.md#sân-mưa-candidate) for report and commands.

Remaining G2 device evidence includes real mobile, Firefox/Safari, real tab switch and listening for loop transitions. Full campaign timing, progression, pump closures, boss phases/locks and late-game performance wait for S04–S05. Pages registration, live publication and G4 require separate approval. No live deployment claim.

Historical next task was GH-41 after a Producer decision. Continue S04–S05 on the same branch and draft PR. Test Hầm Bơm pump/immune pressure and Đài Chớp boss lock dodge and completed locks before full-campaign verification.

## S04 resumption

Trusted main refreshed at `3d4624d018a4b69ec47a74bb042c887376b25e84`. Existing draft head `7f848b795938d34deb9b154a7929054f7dad4170` and the validated import remain the basis of this game-local batch. GH-D05 defers human G2 for this batch. GH-41 and GH-42 are implemented. GH-50 verifies the assembled campaign and the scoped PR.

## S04 — GH-41 and GH-42

The three-level build uses the approved arenas, wave timings, five ordinary opponents and Keeper. Hầm Bơm uses independent timed pump closures, armored and shock-immune pressure, Nấm Vá and wet Rêu Thành recovery. Đài Chớp adds the arming and single-use blast of Lựu Cầu Chì, two boss phases, targeted warnings, rerouting before closure and late cleanup. Campaign progression, map, replay, separate records and the skippable finale share the original local save keys. The contiguous-win check preserves valid S03 saves.

The 13 game tests cover the new simulation rules and both new authored clear routes. Five focused browser tests from the production layout passed, including a valid S03 save, locked stage access, denied storage, new seed decks and keyboard placement. The [S05 report](../reports/QA_REPORT.md#three-level-candidate) records the broader verification and points to exact-head runtime, timed plays and hosted checks on PR #35.

## S05 — GH-50

The game remains game-local and private to the temporary catalog. Candidate review requires all three end-to-end clears and green CI. The [PR verification record](https://github.com/huynhngocsonuit2000github/ai-game-studio/pull/35) carries those results, current head and the standalone three-level archive. Physical mobile, Firefox, Safari, assistive technology and subjective audio review are separate checks. Producer retains merge, Pages registration/publication and G4.

## GH-RETRO-01 v2

Trusted GitHub main was refreshed at `e25dbe3c78a4ef45105bb444e9c55fc088f079f6` (PR #35 merged and public development registration in PR #36). The user-supplied ZIP contained 12,069,094 bytes and matched the external SHA-256 `9e526d783071e163a1d386d5840fe54eb60df197c59441e4cba062bf78ab7603`. The validator staged 54 additive destinations, with zero replacements and zero missing assets. All imported files matched the staged hashes, and every asset had cleared rights. The branch originated at the pinned main with no earlier refresh work. The raw attachment, approval and single validator receipt are kept outside Git.

[GH-D06](DECISIONS.md) authorizes the game-local refresh and public development preview after manual merge. The registry entry and release workflow are inherited from main. The attachment documents prior live inspection at the baseline SHA. The Cloud shell's direct Pages marker request returned a proxy 403, so that historical inspection is kept separate from candidate verification. See the [feature brief](../design/retro/FEATURE.md) and [retro QA](../reports/RETRO_QA.md) for the implementation and acceptance evidence.

## GH-STAGE-MOTION-01

Trusted GitHub main and the approved pack baseline matched at `f854b0055ed66c5a53e9cf100a1cf58d97f7cfce`, the merge of PR #37. The 36,506-byte upload matched SHA-256 `39265dc35c25b0bf8e628a13bdb9163f99b655f4a176607ac81539576bfe1994` for pack `midnight-greenhouse-gh-stage-motion-01-v1`. The repository validator passed in an isolated checkout. The review covered the additive fix brief and six approved CSS, source and test replacements. No runtime asset imports were required. The original ZIP, separate approval and receipt were kept outside Git.

The runtime candidate is `f5dc55b36f7c2ea1e31a4fdf26873f92790d34d8`. Integration review added portrait header wrapping, retries for failed atlas downloads and canvas redraws after DPR changes. Campaign tuning, hit geometry and storage keys are inherited from the approved baseline. [Fix brief](../design/stage-motion/FIX.md) · [Candidate QA](../reports/QA_REPORT.md#gh-stage-motion-01)

The baseline Pages workflow recorded the pinned SHA and HTTP 200 for the catalog and game on 28 November 2026 at 14:26 ICT. The direct Pages request from this environment was blocked. Producer playtest, manual merge and live candidate verification remain pending. After merge, compare the served marker to the actual merged SHA and independently check catalog or direct entry, planting, character motion and fullscreen. [Baseline deploy job](https://github.com/huynhngocsonuit2000github/ai-game-studio/actions/runs/46120538522/job/140905950219)

**Candidate ready.** The canonical Pages assembly passed all 47 browser checks. A fresh normal-speed run cleared Sân Mưa and Hầm Bơm with three stars each and Đài Chớp with two stars. The ending, records after reload, fullscreen, Sổ tay, and standalone ZIP passed. Late Keeper play measured 16.8 ms p95 at 1280×720 and 33.4 ms at 1920×1080 on the Cloud Chromium host. See the [QA evidence and limitations](../reports/QA_REPORT.md#gh-stage-motion-01).
