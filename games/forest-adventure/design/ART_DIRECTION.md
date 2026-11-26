# Art direction

Digital gouache cartoon HD. Warm paper texture and irregular brush edges, layered matte color, rounded friendly shapes. Cream accents #fff1cb and seed #d6e781 stand out against pine #173436, olive #677a4b and mist #a4b9a0. Pip reads as fox orange #d37745 under a jade hood; dark boots, cream muzzle/tail tip and ochre scarf track turning and jumps. Hazards use three distinct dark raspberry thorns. Beetles have indigo dome and short feet. Moths read as wing shapes with lavender/apricot accent.

| Shot | Composition | Validation |
| --- | --- | --- |
| L1 dawn | Pip lower-left against quiet mint background, moss ledge under boots, sunrise in depth. Lantern clear of HUD. | Compare at 960×540 and 1366×768, dark and light monitors. Spot player, landing, threat and gate affordance immediately. |
| L2 mist | Willow aqua/teal behind the same ochre earth grammar. Clear near-ground edges during fast turns. | Check threat silhouette against river tones, move depth layers at different speeds. |
| L3 dusk | Amber oak glow framed by purple shadows; three seed lights echo the title key art. | Preserve thorn vs collectible shape cues and show clear platform edge near warm lights. |
| Menu and promotion | Illustrated key art with embedded wordmark, unobstructed icon art and real text in accessible menus. | Cover and banner must retain title and character at 240 px wide tile/hero crop. |

Playback atlas assets have transparent margins and fixed origin. Use stage measurements and the metadata in assets/runtime/. Draw Pip at 96×96 logical pixels, feet anchored to atlas pivot; face right natively. Beetle/moth art faces left natively. Mirror horizontal facing only; collision body and foot positions remain independent. Plan use of low-frequency down/up motion for idle and a shorter landing squash. First test gated on visual drift in run frames, pivot stability and sprite readability. Particle atlas one-shot clips should stop at last frame, recycle pooled emitters, and use reduced-motion rules.

Layer backdrop at ~0.18 camera x rate and near foliage at ~0.64 with y movement ≤16 px. Keep foreground plant screen height ≤92 px so prompts remain legible; do not occlude Pip at the floor. Align painted grass lip at collision y plus measured inset, verify stitches at run and at zoom, keep grass detail out of hazard tips. Atlas assets use a 4 px gutter; sample frame edges with clamped UVs and no mipmaps in initial build unless edge bleed is corrected. Tone applied in build output only; art sources stay separate. UI bevel panels use a 9-slice and DOM labels. A dark panel fill and cream text provide primary contrast.

[Cover](../assets/runtime/cover.webp) and [banner](../assets/runtime/banner.webp) are authored production art exports. [Illustrated slice target](../assets/concept/fernlight-target.webp) is an asset composition reference. It is not an actual game screenshot. Read the manifest and QA before adopting art as release accepted.

Composition targets for the subsequent campaign stages: [Willow Run](../assets/concept/willow-target.webp) and [Lantern Oak](../assets/concept/oak-target.webp).
