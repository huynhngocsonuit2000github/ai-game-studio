# Art direction

Painted gouache, carved ink outlines, jeweled petals and battered metal. Reserve amber light for Wick, wards and rewards, lavender and mint for player magic, and salmon-orange outlines plus patterned fills for enemy danger. Hard silhouette first. Wick has large ears, teal cloak, red scarf and glowing lantern. Enemies read as cap, wings, shield dome, floating bottle, dangling bell and antlered owl. Keep the ground cool and low-contrast, with interest concentrated at authored landmarks.

| Role | Palette | Direction |
| --- | --- | --- |
| Night base | `#141C28`, `#1D2B36`, `#2C3847` | Muted slate repeat, ornament kept off heavy combat lanes. |
| Wick / wards | `#F2B76F`, `#FFE5B1`, `#3C8F87`, `#DD7B79` | Amber key light and teal/red silhouette. Warm light limited to Wick and active objectives. |
| Player magic | `#B9A2F4`, `#7CDFBF`, `#77CFEB` | Distinct shapes per spell, thin outlines, soft interior. |
| Danger | `#FF886C`, `#62303C` | Thick hatched outline and explicit attack geometry; reserve filled scarlet for direct hit. |
| HUD | `#17182B`, `#504568`, `#F5DFBA`, `#C5BAD5` | Deep wine surfaces, cream reading text, rare bronze accent. |

Use [combat layout](../assets/concept/combat-layout.webp) to judge composition and size. It is a static reference bitmap assembled from supplied runtime atlases. See [asset manifest](../production/ASSET_MANIFEST.csv) for actual files. Use 1536×1024 key illustration for menu details, 720×960 cover for editorial surfaces, 1440×620 banner for wide layouts and 768×432 library card for the existing Studio cover slot. Keep intact cropping on small screens. Accessible names come from HTML.

## Sprite and VFX motion

- Character atlas contains one painted frame per actor. Wick walk uses 5 Hz soft vertical bob (≤2 world px), tilt (≤5°), X-mirror, and lean into movement. Wick idle breathes at 1.4 Hz. Run casts use a warm halo and lantern lift. Dash adds two short displaced silhouettes with alpha falloff and a directional mint edge. Dash action handling stays in simulation.
- A grounded enemy stalks with squash and stretch up to 8%; beetles lean before charge, moths bank, bottle floats (≤4 px). Bell swings during pulse. Elite silhouette has a persistent visible mark when crowding. Plant dust is local around hits. On fatal hit, shrink quickly and burst into three or four small shapes. Eliminate simulation collision as soon as HP hits zero.
- Use projected, compressed oval shadows, pigment tint and hover map edges. Keep Wick shadow as a fixed locational anchor. Ground light is fake radial alpha or a cached gradient sprite, limited to two warm contributors per view.
- Player forecasts use dotted 1–2 logical px outlines. Enemy danger uses 2–3 logical px solid outlines plus hatches and timed fill progress. Teach the distinction once, show severe danger above ornamental VFX, and never hide lag behind flashes. Physical and reduced-motion mode use consistent cue hit locations.
- Animation signoff footage covers walk/stop, dash, five enemy silhouettes, both elites, Warden phases, draft and end/retry. Low-motion mode removes decorative shake, dynamic vignette, extra shake and afterimages while retaining timing and hatches. Blinking effects are subtle, brief and sparse. Keep sound optional.
