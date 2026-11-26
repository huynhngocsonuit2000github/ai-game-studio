# Forest Adventure 2D

Design candidate 0.1.0. The confirmed brief establishes an original browser 2D forest platformer. The detailed design below is a proposal, pending the G0 Producer decision recorded in [DECISIONS](../production/DECISIONS.md).

## Experience

Play as Pip, a fox courier carrying Heartseeds to wake the Lantern Oak. Read terrain, carry momentum through clean jumps and choose between the reliable trail and high paths that reward precision. Tell the story through a two-line opening card, illuminated checkpoints and a restored tree.

- Audience: casual platformer players aged 8+, including first-time keyboard players. Landscape desktop web. L1 vertical slice target 3–5 minutes. Three-level campaign first-clear target 12–18 minutes.
- Controls: A/D or Left/Right to move, Space/Up/W to jump, Escape/P to pause, Enter to confirm. R restarts from the pause menu with confirmation. Touch and controllers are outside this scope.
- Camera: sidescroll, soft lead, a visibly safe landing on mandatory jumps. Main route goes right with free backtracking. High optional paths always rejoin.
- Core loop: read landing and enemy rhythm, jump, collect Heartseeds, light a lantern, reach the portal. All three level seeds activate the portal. Eight optional fireflies award a result stamp and carry no gameplay power.
- Three hearts. Enemy and bramble contact takes a heart. A fall or zero hearts returns Pip to the last lantern with full hearts. Collected IDs persist across recoverable deaths. Restart clears the attempt. Continue from the title opens at the start of the latest unlocked level.
- Results show clear time, falls/deaths, total fireflies and a flawless stamp. Track best time and best optional count separately. First clear has no timer pressure.
- Scope: L1 Fernlight Trail, L2 Willow Run, L3 Lantern Oak. Two enemies, falls, brambles, pause, results, settings and accessibility. S01–S03 build and polish L1 only. No combat button, lives, upgrades, procedural level, accounts, monetization or multiplayer.

| System | Player-visible rule | Edge case |
| --- | --- | --- |
| Jump | Tap to hop, hold for more height; forgiving coyote and buffer windows. | Up release trims upward speed once. Jump fires at most once per ground/stomp cycle. |
| Brambleback | Beetle patrols and visibly hesitates before turning. A downward hit on its shell squashes it and bounces Pip. | Stomp requires previous feet above enemy top and downward velocity. A valid stomp wins over contact damage that tick. |
| Gloam Moth | Moth telegraphs a dip from hover. Any contact damages Pip. | Always resets to a safe initial phase, active route stays away from respawn. |
| Bramble | Purple thorns damage with visible knockback. | Damage lockout prevents repeat hits. Fall triggers recovery even during lockout. |
| Collectibles | Seeds chime and light a gate marker. Fireflies offer quieter feedback and sparkle. | Touch idempotent by stable ID; death keeps owned seeds and fireflies. |
| Lantern | Walk through the lantern to light it. | Respawn resets enemy and hazard phases. Checkpoint is attempt-local, durable records are saved between levels. |
| Portal | Closed portal displays seeds still needed. When charged, touch to finish. | Process pickups before gate evaluation; commit result once, freeze timer and disable gameplay input. |

A representative first minute starts on flat ground. A ledge teaches jump height, fireflies show the first gap arc and the beetle lets the player choose to avoid or stomp. The main route grants Seed 1. A high branch offers optional fireflies before a sheltered lantern. Teach visually with one short prompt per mechanic and no modal interruptions.

## Screens and accessibility

Start exposes Play or Continue, Settings and Back to Studio. Pause exposes Resume, Restart, Settings and Exit to Studio. HUD shows three hearts, three seed markers and optional firefly count. A hit uses an outline blink with no rapid flash. Reduced motion disables shake, swarms and screen-wide UI motion. Shape, sound and labels accompany color. DOM menus keep visible keyboard focus, 4.5:1 text contrast and focus return. Use separate master, music and SFX controls that persist. Essential cues remain legible muted. Auto-pause on visibility loss and require an explicit resume. Results show Next when unlocked, Replay and Back.

[LEVEL_DESIGN](LEVEL_DESIGN.md) owns balance. [LEVELS.json](LEVELS.json) owns geometry. Producer play at G2 is required to assess responsiveness and fun.

## Script references

Opening: “The Lantern Oak has gone dark.” / “Pip, gather the Heartseeds and light the way.” First gap prompt: “Hold Jump to go higher.” Locked door display: “Heartseeds needed: {remaining}.” Recovering displays “Back to the lantern” when one is lit, or “Back to the trailhead” otherwise. L3 finish: “The Lantern Oak wakes.” Provide real UI text with score and controls in the game rather than embedding the instructions in images.
