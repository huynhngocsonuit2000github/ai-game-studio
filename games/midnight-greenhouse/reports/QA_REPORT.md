# QA report

State at handoff: this is a production pack. Static verification passed for 35 listed art/audio/layout files and all three authored schedules. Asset checks decoded all images/audio, checked RGBA sprite anchors and file references, and inspected the three empty arena plates and static silhouettes. Supplied runtime assets total 2,137,759 bytes before integration. Decoded audio peaks span -16.7 to -6.4 dBFS. Browser audio playback and animation remain untested. Browser gameplay evidence is pending implementation.

| Test | Acceptance | State at handoff |
| --- | --- | --- |
| Q01 | Clean install/build via repository rules, click from real built candidate portal, return via relative link, no runtime console/network errors. | NOT_RUN |
| Q02 | Four lanes remain distinct. Legal placements charge once. Occupied, enemy-covered, insufficient and invalid placements never debit. Removing a plant refunds once at 25% floor. | NOT_RUN |
| Q03 | Combat opens after prep. Payout occurs on exact simulation interval, matching wet and dry income. Pause does not pay or count toward time. | NOT_RUN |
| Q04 | Verify only one wet lane through repeated input, 4 s cooldown, blocked requests, wet/dry damage and deterministic multi-target geometry. Raincoat never receives shock. | NOT_RUN |
| Q05 | Verify ranges, blocker/contact behavior, physical lob against armor, root/slow, kill stock awarded exactly once and escape at same-tick arbitration. Win after schedules and all live enemies clear. | NOT_RUN |
| Q06 | Play 1280×720 mouse/keyboard and minimum 844×390 landscape touch. Check all board edges, focus and rotate hint, reduced motion, readable HUD and Vietnamese labels with correct diacritics. | NOT_RUN |
| Q07 | Start L1, intentionally lose after three breaches, retry then finish. Pause and return from tab without skipped waves or unpaused timers. | NOT_RUN |
| Q08 | Per-frame reviewed units and effects at target scale; no clipping, cross-cell sheet fragments, invisible warnings or contradictory art/UI states. | NOT_RUN |
| Q09 | Gesture unlock, audible mix, mixer/mute persistence, bounded voices, pause/resume, repeated retry and inaudible loop joins; record audible browser check separately from file decode. | NOT_RUN |
| Q10 | Lose and regain L2 water route through scheduled fault; reroute legally while blocked, then demonstrate alternate lane economy and correct raincoat/mender behavior. | NOT_RUN |
| Q11 | Play L3 both boss phases, dodge a telegraphed lock and observe one completed lock. Kill boss yet win only later if other enemies remain. Verify separate fault/lock state, L3 victory and boss breach defeat. | NOT_RUN |
| Q12 | Fresh save opens L1 only. Finish L1→L2→L3 via normal Next buttons, reload after each win, replay earlier level, preserve already earned records and verify ending. | NOT_RUN |
| Q13 | Corrupt/unknown save, storage disabled, fastest-time and star improvements independently, repeated result event and locked level access by normal controls. | NOT_RUN |
| Q14 | Run each level at normal speed. Record one no-breach clear route for each, a distinct alternate L1 opening, completion times, one failed route and reason. Check first-run 25–30 min target and tune only with evidence. Record human unaided run separately. | NOT_RUN |
| Q15 | Benchmark budget at heavy L3, cold title and repeated restart on stated environment. Verify no memory/resource growth, downgrade effects at reduced motion and retain timing signals. | NOT_RUN |
| Q16 | Production-assembled candidate tested using trusted preflight with temporary catalog, proper subpath, no leaked private catalog entry, source files, debug controls or concept media in runtime. Preserve canonical catalog. | NOT_RUN |
| Q17 | Once authorized, verify actual live published SHA, catalog and direct route, enter/play/return from public URL, and exhibit rollback target and prior routes. Record Producer G4 and live identifiers. | BLOCKED |
