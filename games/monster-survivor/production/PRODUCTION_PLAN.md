# Stages

First handoff batch **MS Vertical Slice** authorizes S00–S03 in sequence and defers only S01/S02 milestone reviews when the Producer submits the exact handoff prompt. G0 is an explicit design decision in that prompt. G2 stops the batch. S04–S06 describe the first release, to resume on the same game after the corresponding approvals.

| Stage | Outcome | Validation / review |
| --- | --- | --- |
| [S00](../stages/S00/STAGE.md) | Pack validated, scope and entry design ready | G0 design and repo-media authorization recorded |
| [S01](../stages/S01/STAGE.md) | Real movement, attack and reward feedback | Run the unit and browser loop; review deferred in named batch |
| [S02](../stages/S02/STAGE.md) | Slice full path, retry and objective outcomes | G1 functional, review deferred in named batch |
| [S03](../stages/S03/STAGE.md) | Polished 4–5.5 min vertical slice | G2 internal candidate evidence and Producer playtest |
| [S04](../stages/S04/STAGE.md) | 12–15.5 min normal run and release content | G3 feature completion, producer stage review as applicable |
| [S05](../stages/S05/STAGE.md) | Stability, device and balance hardening | Release candidate with regression, media and perf evidence |
| [S06](../stages/S06/STAGE.md) | Studio registration/publication and verified release candidate | G4 Producer release approval. Distinct approval for public Pages. |

Use one game PR for each coherent authorized batch, dependent stages only after a technical pass. Keep scene art, UI polish, core decisions and victory intact if reducing iteration scope. First cuts for budget are ornamental particles, damage-number density and optional music preloading. Changing approved release content requires Producer decision. File hashes change when content changes. Redo relevant QA after a retune, rebuild or title asset edit.
