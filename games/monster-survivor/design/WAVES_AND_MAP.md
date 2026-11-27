# Waves and map

[Garden layout](data/garden.json), [wave director](data/waves.json) and [rules](data/rules.json) are runtime inputs. Coordinate origin is top-left, y increases down. Map names appear briefly on approach. Three distinct landmarks break the silhouettes without turning the arena into a maze.

| Landmark | Role | Set dressing |
| --- | --- | --- |
| Orchard Ward (NW) | First obvious route from starting lane, available in slice. | Lilac mushrooms, half arch, dark jade grass, warm amber rim. |
| Wet Bell Ward (NE) | Second route near a bent arch with a wider kite lane. | Slate and broken turquoise bell with damp violet moss. |
| Thorn Gate Ward (S) | Shorter path for aggressive nearby rotations. | Low thorn groups, stump and curved trail of amber petals. |
| Warden Dais (C) | Boss entrance with visible arena and safe corridors. | Round paving offsets and ground-cut sector markings. Avoid solid obstacles on the dais. |

Boundary is visible and solid at margin 35. World width 2,400 and height 1,600. Rectangular occupancy grid (e.g. 80 px cells) supports soft neighbor steering; use padded free cells for spawn and line-safe telegraphs. Sprite bases align to world points while tall parts may overlap. Draw props by feet Y with explicit ground, entity, VFX, telegraph and HUD passes. Do not spawn solids randomly. Seed decorative placement and reject spawn/rite/path overlaps. Floor mats and preview layout are guidance; collisions come from data.

## Wave director

Each group is `[enemyId, membersPerEvent, weight]`. Accumulate fractional events as `dt * eventsPerSec`. Select one weighted group per whole event from the seed. Allow truncated groups at cap. Never backlog a skipped event. Position outside a padded camera rectangle within map bounds, with at least 265 px player separation. At edge, pick farthest legal within-bounds off-camera sector; when none exists skip normal events. Elite arrival gets a reserved slot and telegraph before materializing; if every off-camera point fails, choose a legal padded point with visible 1 s entrance cue and distance minimum. Use deterministic bounded search. Seed independent wave, AI, draft and cosmetic streams. Normal caps exclude elites and boss. Added boss Seedlings/Moths share capped normal slots. See Boss Design for objective deadlines and cleanup.

## Slice and release

| Track | Waves | Required rites | End |
| --- | --- | --- | --- |
| Slice | 00:00–04:00, 3 normals + Thornback | Orchard only, 6 s charge, by 04:00. Brief hard countdown during final 30 s. | Warden at 04:00 if rite complete. 660 HP. No initial adds, 2 phases, 05:30 limit. Chosen in S03. |
| Normal | 00:00–12:00, two elites, Overrun only if needed | Any 2, 9 s charge, by 13:30. | Warden after 12:00 and before rite deadline expires. 4,800 HP. 3 phases. Hard stop at 15:30. |

Slice pool uses starter dart, Prism Ring and Bog Bloom, four passives, and Comet Thread. For playable G2 validation guarantee at L2 a Prism Ring or Bog Bloom choice, and always include one possible Dart/Thread Lens upgrade if legal from L3 until they reach recipe ranks. Section S04 removes this guidance for Normal. The S02 prototype may use accelerated internal scheduling, with runtime preview and G2 using authored slice rules. Once release implements Normal, do not expose the slice selector in public release builds.
