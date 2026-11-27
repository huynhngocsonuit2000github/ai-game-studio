# Forest Adventure · Ten New Trails

Feature EXP-10-TRAILS · Pack EX10-FERN-D1 · intended expansion beyond 0.1.0

The Producer asked for exactly **10 new levels**. Preserve the three original campaign levels and add these ten as a new chapter after Lantern Oak. The expanded campaign has 13 levels. No extra worlds, abilities or required art/audio production. The existing 60 Hz session, Phaser rendering, enemy rules, three Heartseeds, eight optional fireflies and three hearts carry forward.

The original level IDs fernlight-trail, willow-run and lantern-oak remain canonical. The new stable IDs in the layout JSON are trail-01 through trail-10. Keep the original maps, their ending and the public game route. In the expansion variant only, a valid Lantern Oak clear makes the New Trails chapter accessible. Preserve replay and progress for the original three levels.

| New level | Difficulty | Main encounter | Optional choice |
| --- | ---: | --- | --- |
| 01 · Acorn Causeway | 2 | Offset takeoffs with a low raised island in the first cluster. Reset on a long landing before the later thorns. | Collect the early air firefly by holding the first jump. |
| 02 · Twinroot Fork | 2 | Choose broad lower ground or an upper root stair that reconnects before the next crossing. | Follow the upper fern shelves for extra pickups instead of taking the lower path. |
| 03 · Stagfern Terrace | 2 | Read beetles across separated long terraces and decide whether to hop over or stomp. | Use the shelf between patrol zones as a high recovery route. |
| 04 · Hollow Stump Drop | 3 | Land on a raised island, descend in two steps, then time a later jump up to a lower shelf. | Take the high outcrop chain before dropping back to quiet ground. |
| 05 · Mothwatch Rise | 3 | Climb for the first Heartseed, then use the open low lane under the first moth and read the last dip. | Follow the next two-tier staircase to collect high fireflies. |
| 06 · Foxfire Bend | 4 | Pass the gate with two seeds, descend beyond it for the last and return uphill. | Collect the fireflies on the upper shelf while returning. |
| 07 · The First Lantern | 4 | Cross a raised split landing and rest at the lantern. Later rooms alternate simple leaps, thorns and patrols. | Connect stepping-stone rewards and take the upper ledge before the gate. |
| 08 · Bracken Gallery | 4 | Alternate open stairs with a low canopy where staying grounded is quicker and safer. | Climb the outside stairs over the shaded passage for the high fireflies. |
| 09 · Ravine Switchbacks | 5 | Cross a sequence of asymmetric banks. Alternate uphill takeoffs, lowering drops and dry rest lanes. | Use the balcony shelves during the first and last climbs. |
| 10 · Oaklight Finale | 5 | Revisit rising jumps, patrol reading and safe drop timing in separate chambers before a calm finish. | Use the upper balcony over the final brambles and finish along the high ledge. |

The new levels use a gradual difficulty curve with rest pockets. The same mechanic can be used again when it changes a player's route choice, timing or landing height. Each pair of consecutive levels should feel different in play. Keep a readable destination for every mandatory jump, preserve one safe checkpoint per level and avoid trapping Pip beneath a solid ceiling or in an optional pocket. Tune the mean new-level first clear toward 60–150 seconds in real play. The headless input fixtures verify reachability and do not measure first-clear pace.

[Layouts](layouts/TRAIL_LAYOUTS.json) contain authored geometry, enemy positions, markers, selected checkpoint, three seeds and eight fireflies for each level. [Replays](layouts/TRAIL_REPLAYS.json) exercise the actual pinned Session without injecting player state. [Verification](VALIDATION.json) records the results. Start with the three easiest maps as a local integration check, then wire up the remaining seven in the same proposed feature batch after reviewing the technical baseline.
