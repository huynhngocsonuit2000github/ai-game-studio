# S04 — Campaign content

Dependency: S03 and explicit G2 approval. Player outcome: play, unlock, replay and finish three levels. Scope excludes new mechanics, bosses and optional devices.
- S04-1 Tune and import L2/L3 from LEVELS.json. Use supplied backgrounds and the defined shared sprite bank. Quality and rhythm match Fernlight baseline.
- S04-2 Implement results/Continue save and best statistics. Prove Reload, corrupt save, progression at each gate, replay and final ending.
- Assets: bg-willow.webp, bg-oak.webp, lantern-oak-theme and all shared atlases, and reuse the portal, cheer pose and VFX for the finale.
- Acceptance: Q02–Q08 and Q15 pass for all levels; complete full campaign, no unreachable mandatory seeds, no mid-level loading stalls or broken saves, re-run L1 baseline. Player sees an intentional finale.
- Preview: candidate includes all three levels. Automatically create/update one PR and stop.

## Combined candidate checkpoint

The Chromium keyboard route cleared Fernlight Trail, Willow Run and Lantern Oak in order with all 24 fireflies. It lit all checkpoints, unlocked each next trail, reached the finale, replayed the final trail and reloaded into a fresh Lantern Oak attempt through Continue. Storage and independent best records were checked separately. The full campaign is ready for combined candidate review under D11. [Combined QA report](../../reports/QA_REPORT.md)

## Public development preview

FA-PAGES-01 applies D14 to the normal Pages build. The hosted catalog retains its In Development status. The browser regression clears all three trails from the assembled artifact using keyboard controls, checks both Next Trail transitions, unlock records, the finale, replay, trail selection and Continue after reload. [QA evidence](../../reports/QA_REPORT.md)
