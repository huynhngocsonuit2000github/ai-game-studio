# EXP-10-TRAILS checkpoint

- Game `forest-adventure`, pack `EX10-FERN-D1`, branch `prod/forest-adventure/exp-10-trails`.
- ZIP SHA-256 `7d12099a236c7773b47c20bbf3580a93b24285763cf49c1a5d29e789554bb508`. Authored base `ea96679a42732a3a260fa4d77b35c6a2ac8bd115` is an ancestor of implementation base `199fce3866c18d7b8267be10268ed9906079ca75`. The original layouts, Session and runtime assets match the authored base.
- The Producer's task authorizes the ten levels, the complete technical batch, and public development preview with cleared existing assets. Producer playtest and formal release remain pending. Public catalog version and status are 0.1.0 / In Development.
- The supplied manifest uses a feature schema outside the current Studio validator’s scope and stage fields. The Studio archive-member checks passed. Validated exact inventory, sizes, CRC and all five SHA-256 digests in isolated staging against the Producer's authorized destination. Imported the five payloads byte for byte. The payload contains documentation and JSON data and uses only new destinations.

## First three trails

PASS. Game typecheck and 28 unit tests passed. The isolated campaign build passed all 8 Chromium tests, including keyboard clears of the three legacy levels and trails 01–03 through normal progression. The new replays matched the supplied clear ticks, all three Heartseeds and eight fireflies with no deaths. This gate was completed before enabling trails 04–10.

## Full campaign

| Gate | Result |
| --- | --- |
| X10-1 | Baseline typecheck and 19 unit tests passed. Both baseline browser commands cleared the original three trails but reported 6/7 tests passed because the catalog cover request was canceled on navigation. The candidate verifies that the cover decodes on both catalog pages and accepts cancellation of duplicate cover requests during navigation. Original IDs, level data, shared Session and public game route are preserved. |
| X10-2 | All 13 deterministic clears passed, with their expected times and pickup counts. The assembled Pages Chromium playthrough started in the Studio catalog and cleared all 13 trails in order using keyboard input, the real renderer and simulation, and a controlled frame clock. All ten supplied replays produced exactly three seeds, eight fireflies, three hearts and zero damage or deaths in Session. Browser clear times matched each supplied tick count. The Foxfire Bend portal rejected entry at two seeds, and Oaklight Finale showed the final completion screen. |
| X10-3 | Tested fresh, incomplete, completed, corrupt, and unavailable saves. A valid Lantern Oak clear unlocks Acorn Causeway during one-time migration into `forest-adventure:exp-10-trails:preview:v1`; the original `forest-adventure:save:v1` bytes remain available for rollback. Verified sequential unlocks, Continue, selection of unlocked trails, replay, independent best records, reload, pause, checkpoint recovery and restart. |
| X10-4 | Verified the standard assembled `deployment/dist` Pages output under `/ai-game-studio/` in Chromium, including catalog entry, cover, relative assets, direct game route and Back to Studio. The standard output contains the approved 50 media hashes and both MIT notices. Replay fixtures are absent from the public runtime. The complete keyboard run recorded zero unexpected console or network errors. Public deployment and live verification await the verified-main workflow. |
| X10-5 | Producer playtest and acceptance pending. Automated fixture runs measure reachability. First-clear pacing, first-run deaths and difficulty on the Producer's target laptop require the Producer's playtest. |

### Verification and budgets

Studio lint, Studio and game typecheck, 36 game tests, 42 Studio tests, 11 Studio pack validator tests and 6 Studio browser smoke tests passed. The public Pages build and the local campaign build each passed 8 Chromium checks. The game asset validator matched the 58 runtime files to the checked-in manifest. The production build verifies the approved subset of 50 files emitted for Pages.

Cloud Chromium 156 at 1366×768, DPR 1, with cold cache and 10 Mbps / 100 ms RTT, reached Play in 2.510–2.653 seconds across three runs. Each transferred 2,235,547 bytes by menu ready. The assembled game directory is 6,613,433 bytes. A real-clock Acorn Causeway restart sample collected 1,746 frames at 16.7 ms p95, with 6.28 MiB post-GC JS heap, one canvas and zero request or page errors. Target-laptop measurements remain open.

### Keyboard captures from the assembled Pages artifact

- Twinroot Fork uses upper shelves above a lower lane with a beetle. [Trail 02](evidence/trail-02-route.jpg)
- Foxfire Bend passes the two-seed gate to reach the last seed beyond the drop, then doubles back. [Trail 06](evidence/trail-06-route.jpg)
- Bracken Gallery uses the high stairs and then drops for the second seed, with a lower passage under the shelves. [Trail 08](evidence/trail-08-route.jpg)
- Oaklight Finale records the result and offers replay or trail selection. [Trail 10 completion](evidence/trail-10-cleared.jpg)

### Reproduce and resume

The implementation PR head identifies the tested candidate. On that commit, run from the repo root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @studio/forest-adventure typecheck
pnpm --filter @studio/forest-adventure test
pnpm --filter @studio/forest-adventure test:browser
pnpm --filter @studio/forest-adventure test:campaign
```

For manual local review, after `pnpm build && pnpm assemble:pages && pnpm verify:pages`, serve the assembled files with `pnpm --filter @studio/portal preview --base /ai-game-studio/ --outDir ../deployment/dist`. Open `http://localhost:4173/ai-game-studio/#/games/forest-adventure` and select **Play preview**.

The existing Pages workflow deploys the current verified `main` only. After review and manual merge of the implementation PR, verify that the deployed `build-sha.txt` matches the merge SHA. Smoke-test the deployed campaign and Back to Studio at the published Pages subpath. Record the exact published SHA and run the Producer playtest at that revision. Formal release remains subject to the existing release gates.
