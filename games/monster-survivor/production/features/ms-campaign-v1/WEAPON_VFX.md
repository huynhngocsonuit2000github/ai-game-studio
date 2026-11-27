# Weapon VFX and combat feedback

**Required in the same Campaign v1 batch.** Make Wick look powerful as soon as the first spell fires, then visibly change the attack as the player invests in ranks, a weapon, and an evolution. Use the existing dark-cute, painted visual style. Campaign is the target. Implement with game-local Canvas effects and the existing sprites, glyphs and audio cues. The shipped game needs no new external asset.

## Distinct attacks

Keep emitted trails behind moving tips and enemy tells above player effect fills. Use a bright near-white core, a distinctive colored silhouette, and a low-opacity second layer. Spawn an impact at the actual confirmed collision location with two to five brief directional fragments. Charge, travel, impact and aftermath should read as distinct beats. For orbit, shield and zones, communicate ongoing state on the character or floor rather than adding repeated large flashes.

| Attack | Color and silhouette | Motion and impact |
| --- | --- | --- |
| Wick Dart and Comet Thread | Amber pointed bolt with a white tip. Comet uses deeper orange and a braided two-tone ribbon. | Thin travel streak; at Campaign Rank II a small expanding impact ring shows the actual splash radius. Comet pierces with tiny contact sparks and emits a larger bloom on final hit only. |
| Prism Ring and Crown of Glass | Lavender orbit crystals with sharp white facets. Crown has a pale outer crescent. | Broken orbit arc and brief fan of shards at hit. Crown's actual full-orbit pulse draws one segmented outward ring. |
| Bog Bloom and Green Midnight | Jade leaf clusters with curved scalloped pool edges; Midnight adds lime vein accents. | Floor pool grows briefly on activation, then settles into a translucent boundary. A poisoned death that actually spreads status draws short root arcs to affected enemies. |
| Foxfire and Lantern Pack | Cyan wisps with flame silhouettes and a narrow white core. | Short curled projectile tails. Lantern Pack paints a fan of cyan embers at the real dash endpoint when its evolved Burst triggers. |
| Hex Bell | Brass double rim with an indigo inner line. | Outward pressure ring on cast, clear cutoff at the damage radius and brief arc marks on actual targets. |
| Mirror Ward | Mint angular shield with visible pips. | Brief outward fracture and shard scatter when a charge is actually consumed. |
| Starfall | Lilac dotted marker, pale violet descending streak and star-shaped impact. | The dotted warning persists for its actual delay, then one descending streak and a short ground star. |
| Lantern Burst | Amber-white near Wick, surrounded by an orange segmented ring. | Brief ignition cue, expanding wave and petal-shaped edge sparks. Shape communicates real radius. Mini impact rings mark nearby affected targets without hiding the Warden. |

## Gear and rank identity

- Default Wick Dart has a short amber tail and a defined hit spark at rank I. Rank II noticeably adds a splash cue on hits. At ranks III–V increase tail layering and taper quality, keeping geometry synchronized with gameplay. Evolved spells receive the distinct shape listed above at the first actual evolved cast.
- **Ember Lantern** gives incoming main-shot sparks a warm split-tail accent. **Prism Lantern** uses amber-to-lavender facets and visibly larger Rank II splash matching its actual stat. **Warden Lantern** has an ivory center and dark amber trim; its equipped bonus shows as a wider Burst ring matching the real radius. Accent upgrades +1, +2 and +3 increase facet or trail detail through clear steps. A camp loadout preview shows the weapon visual in a small looping sample with its actual listed bonuses. Reduced Motion can show one static frame.
- Elite and chest loot show a short rise-and-settle animation, a colored outline plus distinct item/coin silhouette, and the item name after pickup. Common, uncommon and rare tiers use cream, cyan and violet plus a shape marker. Loot visibility takes priority over decoration.

## Rendering and accessibility

Reuse the current Canvas renderer, simulation cue pattern and audio logic. Add stable spell/cast/hit identity, confirmed positions and bounded event records as needed. Render-only animation must consume no simulation RNG, change no hit results, and create no additional attack effects. Render ground zones, player trails and hits, enemy danger, and HUD in that order as appropriate for readability. Preserve existing enemy telegraph timing. Ordinary impacts target 90–180 ms; major hero effects cap at 450 ms. Off-screen cues are culled, buffers use fixed caps, and old decorative effects yield to hazards and loot. Cap decorative particles at 160 desktop / 64 Low Detail and 12 active travel trails / 6 Low Detail. Group repetitive hit audio/particles with per-source cooldowns. Reuse common gradients/paths or pre-render small reusable sprites. No screen-wide white flashes. Reduced Motion removes decorative shake and extended ribbons while retaining cast flash, confirmed hit, footprint and hazards. Low Detail keeps the same gameplay cues with fewer particles and one contour. Preserve browser size and frame-time budgets on the same dense encounter headless or local device build, recording hardware and unavailable measurements.

## Acceptance

Capture 3–5 second clips or ordered gameplay frame sets with the same zoom for starter Dart → Rank II splash → upgraded weapon, Prism/other weapon during a dense fight, same encounter in Low Detail, and Burst against a boss telegraph. Compare with before footage from the pinned Normal baseline or a matched pre-effect Campaign implementation. Verify active shape identities, real event alignment, no hidden loot/hazards, no persistent effects after pause/retry/transition, and identical combat hit results across visual settings. Take visual signoff from actual assembled Pages gameplay. A static concept image is not sufficient evidence.
