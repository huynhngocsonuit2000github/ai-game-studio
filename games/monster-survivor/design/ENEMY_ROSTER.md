# Enemy roster

[enemies.json](data/enemies.json) defines base stats and AI parameters. All variant art uses the same atlas IDs and reads differently through animation, size and fixed silhouette overlays. Movement and AI decisions run in world coordinates. Enemy contact zones cap to the body radius and use one damage pipeline. Shot rates and HP scaling are independent of frame rate.

| Enemy | Player decision | Staging |
| --- | --- | --- |
| Seedling | Learn kiting and loop back for XP. | Enters from the first wave and remains a low-threat group filler. |
| Velvet Moth | Change direction when a lateral flank lines up. | Joins after 00:45 Normal. Turn rate limited; never teleport. |
| Bramble Scarab | Leave its striped path then exploit recovery. | Heavier shape; solid obstacles stop its charge. |
| Bog Brewer | Break ranged line or move across the lane. | Stops in range, backs away below the inner band, and fires at locked center after the tell. |
| Bellbone | Step out of the striped disk, then close the gap. | Pulses with one target instance per cast. |
| Thornback Captain | Read a wider charge, turn and collect chest. | 03:15 Normal, 01:45 Slice. One live chest per kill, does not time out. |
| Discord Bell | Dodge first pulse and separate echo timings. | 07:25 Normal. Echo has a fresh visible tell as soon as first pulse finishes. |
| Hollow Warden | Preserve dash for worst position and use recovery windows. | See [boss design](BOSS_DESIGN.md). |

Normals and elites seek navigation around solid blockers. Separate enemies softly from each other and use capped steering with deterministic fallback. At minute 3, 6 and 9 multiply normal HP by 1.12, 1.26 and 1.42 respectively (step bands, not cumulative). No speed or damage ramp on the same ticks. Elite stats are fixed. Use a ±8% seeded size variation only for normal visuals; never change hitboxes.
