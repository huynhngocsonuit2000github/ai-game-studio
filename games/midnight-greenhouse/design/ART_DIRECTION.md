# Art direction

The refresh uses the supplied original illustrated garden and the left-hand garden notebook. [Current art target](retro/ART_TARGET.md) · [Sổ tay and animation contract](retro/FIELD_GUIDE.md)

The original visual direction below preserves the S00–S05 handoff. Its boards, HUD and single-frame motion treatment describe the pre-refresh candidate.

A premium painted miniature greenhouse after midnight. Use teal slate, weathered copper, warm amber stained glass and ultramarine rain. Sân Mưa is welcoming amber and green, Hầm Bơm contrasts cyan glass and lilac boilers, Đài Chớp uses cobalt with hints of magenta. The playfield should remain dark enough for unit visibility. Water, warnings, immunity and locks each have a separate visual silhouette and text cue.

## Supplied imagery

- Art reference: `assets/concept/visual/greenhouse-vision.webp`. Use for color, material and overall tone. Runtime board geometry comes from the empty-by-design calibrated boards.
- Runtime: three illustrated boards, 12 isolated RGBA WebP units, a campaign illustration, a 640×360 cover and the placement metadata in `assets/runtime/art/layout.json`.
- Original plant/enemy raster source sheets live in `assets/source/art`. Exported units have one painted pose and a transparent gutter. Author transform-based animation with meaningful windups and reactions, masking and layered VFX. All frame animation, HUD, particles, shape cues, cursor previews, water animation and ending motion are implementation work.
- Position each unit with its documented anchor at the lane feet baseline. Use sizing relative to a lane: normal plants approximately 58–78% of lane height, ordinary enemies 73–88%, keeper 110–128% clipped only by the viewport boundary. Render large units in feet-depth order so a unit crossing a row boundary never hides selectors. Ground shadows as faint short ellipses. Adjust transforms at reduced-motion settings without changing timing.
- Layout values are normalized against the original full board bitmap. `xPlantSpan` holds the left/right tile-region boundaries for eight equally sized columns. `visualRowEdges` spans each real painted aisle, and `feetY` marks its baseline. Lay out the grid and controls against this transform and keep highlights within the visual aisle. Reserve space right for spawn warning; the numeric simulation starts at x=8.45 where tile-range begins at x=0. The board can use nonuniform fit in compact landscape only if its aspect distortion stays under 8%; do not stretch individual unit art. Preserve 44px touch targets at the minimum landscape viewport by favoring board width and compact HUD.

## Primitive motion cues

Every defender has a readable idle, anticipation, action and recovery. Use restrained bend/squash and recoil for shared rigs. Fern pulls back then releases at impact arc, bramble compresses then unfurls roots at contact, Orchid gathers a white-gold point and discharges a segmented line, wall jolts on hit then settles, pod pulses twice before armed. Pitcher overflows with a tiny gold token on payout. Enemies bob forward with different cadence, hunch on bite and pop a subtle brief light outline with damage. Boss telegraph uses a striped lane, clamp icon and 2.4 s countdown. Support reduced motion via softer movement and no fullscreen flashes. Keep streaks and hit bursts below 180 ms except actual telegraph duration. On breach, a core indicator drops and the leaking lane highlights. Explain the first breach in results.

## Representative screens

| Screen | Image/use | Evidence to produce |
| --- | --- | --- |
| Title + three-card map | Campaign art fades to a damp copper frame. Use unmodified cover for catalog. Real Vietnamese text outside art. | 1280×720 and 844×390 with three clear stage states. |
| Sân Mưa · active wave | Warm row markers, pale wet lane and a readable segmented Orchid chain. Wave HUD shows current count, next threat and projected lane. | Active water, four distinguishable defenders/enemies not clipped, tile focus readable at phone scale. |
| Hầm Bơm · pipe fault | Cool charcoal board with bright dashed fault band, closed-valve badge and countdown. | Warned lane and wet lane visibly distinct even in greyscale. |
| Đài Chớp · boss | Red accent on the keeper's warning, keep gold electrical combo distinct. Boss HP bar with phase marker. | Two screenshots: telegraph during phase two, then victory and completion screen. |

Use minimal overlays and readable system typography. Keep text contrast at least 4.5:1 on HUD panels and visual control outlines at least 3:1. Never burn UI text into board art. Asset and UI polish pass uses captures from the normal game entry, not composed mockups.
