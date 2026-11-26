# Stage queue and gates

D11 authorizes one combined implementation task and PR for S02–S04. Stage files own individual work items and dependencies. Review top risks early: creative scope G0, foot positions/terrain seams in S02, asset rights at S00/S06, Studio scope for lockfile and CI, audio on target browsers in S03/S05. A fixed stage budget is one coherent PR. If scope slips, cut L2/L3 variants or optional effects before responsiveness, readable hazards or final feedback.

| Stage | Work IDs | Waits for | Outcome | State |
| --- | --- | --- | --- | --- |
| [S00](../stages/S00/STAGE.md) | S00-1/2 | Producer import + G0 | Confirm scope, approved import, dependency and CI path | accepted |
| [S01](../stages/S01/STAGE.md) | S01-1/2 | S00 accepted and dependency authorization | Playable L1 core loop in a browser (G1) | accepted |
| [S02](../stages/S02/STAGE.md) | S02-1/2 | S01 accepted | L1 coherent art, UI, camera and animation | internal slice validated |
| [S03](../stages/S03/STAGE.md) | S03-1/2 | D11 combined review | Polished L1 with accessible audio and Producer playtest (G2) | automated checks passed, playtest pending |
| [S04](../stages/S04/STAGE.md) | S04-1/2 | D11 combined review | L2/L3, campaign, best records (G3 candidate) | candidate_ready |
| [S05](../stages/S05/STAGE.md) | S05-1/2 | S04 accepted | Budget and cross-browser regression, close G3 | planned |
| [S06](../stages/S06/STAGE.md) | S06-1/2 | S05 accepted + G4 release approval | Full Pages release and rollback rehearsal | planned |

Use ready, in_progress, blocked, candidate_ready or accepted for active work. “Planned” here means dependencies unresolved. A stage cannot pass with missing acceptance evidence. QA case statuses are PASS, FAIL, BLOCKED or NOT_RUN. Engineer acceptance is technical; Producer records an explicit visual/play/release decision. One bounded repair loop per issue, three attempts maximum absent new evidence. A build alone is insufficient.
