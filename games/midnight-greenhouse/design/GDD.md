# Nhà Kính Sau Nửa Đêm

Original 2D single-player web lane defense. You are the night gardener of a rooftop greenhouse. Fungal gardeners have climbed the stairs to steal the Heart Seed. Plants hold the aisles while you redirect one water supply. Vietnamese is the only required player-facing locale. Campaign: exactly three authored stages, approximately 25–30 active minutes for a first clear, including planning time. Sessions are playable with mouse, keyboard or touch in landscape.

## What the player does

Read the next wave, plant a formation, route water where it will earn resources or enable a combo, survive the wave, and adapt. In the opening minute, plant a Dương Xỉ where the first silhouettes appear, route water through a Bình Hứng in a quiet lane, then switch to Lan Sét when a cluster enters the defended aisle. An arc hits several targets, while moving the water temporarily sacrifices the collector's bonus. Later, physical attacks, economy and control compete for the same slots. Normal mode must be clearable with at least two materially different opening builds.

## Board, input and flow

Four lanes numbered 1–4 from top to bottom, eight plant slots per lane. Col 1 is at the core; enemies enter through the right at x=8.45 in tile units and breach at x=−0.35. One unit per tile; adjacent tiles and enemy occupancy are checked before cost is deducted. Visible lane buttons at the left show wet status, time to reroute, reason unavailable and a shape marker. Select a card and click or tap an empty tile to plant. Preview cost, target range and validity. Support keyboard focus through controls, arrow navigation on the board, Enter/Space to apply, Escape to cancel or pause, and digits 1–6 for cards when focus is outside a control with its own key handling. Move focus to the result dialog after win/loss and return focus on close. Right-click or Escape cancels an active plant cursor; a visible Tháo cây tool works on touch and gives a 25% refund rounded down. Invalid actions never drain stock, card charge, or water cooldown. Ignore global shortcuts while typing or when a modal owns focus.

Flow: title → campaign map → stage briefing and 20 s preparation → waves and cleanup → results → replay / map / next unlocked stage. Briefing explains each rule in one sentence and a diagram; tutorial cues are once-per-save and replayable from the stage briefing. Return to map warns before dropping the current attempt. The game only saves at stage results and settings changes. Reload returns to the campaign map. Start/finalize waves on simulation time; the authored schedule is relative to combat start. At 3 HP, the core can survive two ordinary breaches. Each enemy that exits deals its listed core damage and is removed. Core zero is immediate defeat, even on the final tick. Victory requires every scheduled spawn emitted, no live enemies and positive core HP. A live boss counts until killed or breached; boss breach is lethal. Retry resets all transient timers, resources, pointer state, projectiles, UI selection and audio loops. Loss preserves progress already earned.

## Economy and water

Seedlight (Ánh Hạt) is integer stock. Start and baseline income are per stage in `TUNING.json`. Passive +5/5 s of combat, +5 for each ordinary kill, +10 for elite raincoat or moldmender. No income during preparation or pause. Each Bình Hứng produces +10 every 8 s after combat or placement, whichever comes later, plus 8 if its lane is currently wet when payout occurs. Income is credited directly and briefly floats above its source. Max two live collectors per lane. Opening stock supports a collector and an attacker on each stage where economy requires them, with at least one follow-up attacker affordable before a predicted breach in the baseline playtest.

Route water using the lane buttons. First legal selection is immediate, followed by a 4 s global reroute cooldown. Starting lane is dry. Water is binary and only the active legal lane is wet. Drying a lane immediately stops wet bonuses. On a forced flow cut, active lane becomes null and cooldown retains its remaining duration; user may reroute to another lane as soon as cooldown permits. Reject same-lane and blocked-lane requests before changing state. Hydraulic faults use a 3 s warning followed by a 16 s closure; boss locks have their own longer telegraph. Overlap uses independent source IDs and the latest remaining expiry, with no duplicate event or invisible closure.

## Plants

The six cards use the IDs in `TUNING.json`. All attackers face right and target only enemies ahead in their own lane unless explicitly specified. Cooldown clocks hold a ready action if there is no legal target. A new placement is ready immediately except collectors, Orchid (arming 1 s), and Pod (arming 3 s). Cooldowns are per specimen, with a 1 s placement lock per card ID to suppress accidental double taps. Each plant has a unique animated action and sound.

| Plant | Role and rules |
| --- | --- |
| Bình Hứng Mưa | Passive stock income. The wet glow and payout label show the bonus clearly. |
| Dương Xỉ Nảy | Reliable physical lob within 6.5 tiles. First target is closest ahead. If shielded, the arcing shot ignores frontal armor. Cooldown starts when firing. Hit uses chosen target if still alive and in lane, otherwise fizzles. |
| Gai Cuộn | Short-range physical poke and root for 1.6 s on non-bosses. Repeat roots refresh to the longer remaining duration. Roots stop movement only; adjacent enemies may still attack. Boss receives 25% slow for 1.0 s, no root. |
| Lan Sét | Dry: single-target shock. Wet: jump to up to three additional susceptible targets in the same lane, in increasing x order, each within 1.45 tiles of the preceding hit. Wet primary still max 5 tiles ahead. Raincoats block selection and chaining, immune to shock and skipped when looking for a susceptible target. Physical sources remain effective. |
| Rêu Thành | High-HP wall with no attack; slow regeneration while wet after 4 s without damage. Occupies one tile and blocks while alive. |
| Lựu Cầu Chì | Arms, then detonates once when a live enemy enters within 0.65 tiles of its tile center. Physical AoE within 1.35 tiles in own lane only, consumes the plant. If destroyed before arming, fizzles. No serial automatic replant. |

## Enemies and boss

Enemies have independent HP and simulation IDs. On contact with the first live blocker in their lane, stop and bite on interval. Enemies stack with visual jitter only; damage/range use simulation position. When multiple objects overlap, resolve valid actions by event priority in `TECH_DESIGN.md`. Show affected plants, enemies, and the core taking damage without heavy flash.

| Enemy | Readable rule |
| --- | --- |
| Nấm Gác | Baseline walker with lantern. |
| Mũ Tím | Fast courier with scarf; shorter reaction window but weak to bramble. |
| Chậu Giáp | Heavy front armor scales Bramble hits ×0.45; Fern, Grenade and shock ignore front armor. |
| Áo Mưa | Mustard hood and crossed-bolt icon; immune to Orchid including jumps. |
| Nấm Vá | Medicine pack; heals one lowest-HP-ratio damaged ally within 1.75 tiles in lane every 6 s (flat 22 HP, excluding self and boss). Never revives. Cooldown starts on heal. |
| Thợ Vườn Gốm | Two lane-locked phases at >55% and ≤55% HP. A visible 2.4 s warning targets the lane currently wet (its own lane if none). Telegraphed lane stays fixed even if the player switches, enabling a dodge. Targeted lane locks for 10 s, never all four lanes. First warning 11 s after entry, then every 25 s in phase one or 19 s in phase two, counted from resolve. On threshold crossing, warn once immediately if another warning is inactive, else keep current cycle. No overlapping boss warnings. At phase two walk speed ×1.2 and bite damage ×1.25. Boss cannot be displaced. Cancel unresolved and active boss locks on death; hydraulic faults remain. |

## Campaign

| Level | Situation | Change in play |
| --- | --- | --- |
| 01 · Sân Mưa | The first night watch. Six waves, core 3 HP, four starter plants, first fan of threats enters lanes 2 and 3. | Learn water economy, dry/wet shock and the warning strip. Two of the last three waves add armored or insulated pressure in another lane. |
| 02 · Hầm Bơm | Six waves. Unlock Rêu Thành. Pump faults close only one wet route at a time; raincoat and healer combinations arrive. | Route around outages, use walls to buy time for a physical lane, split your economy across two sides. |
| 03 · Đài Chớp | Seven waves. Unlock Lựu Cầu Chì. Two scheduled faults before the boss, then a seeded authored convoy and Thợ Vườn Gốm. | Plan the boss lane while other lanes demand coverage. Use the boss tell to move water ahead of a lock or leave it committed to win the current combo. |

`TUNING.json` is the initial implementation data, with exact wave times, lane IDs, group cadence, hazard events and budgets. Tune values after real clears and keep the final checked-in data and documentation consistent. Avoid long periods with nothing to act on. Pins and prep times are deterministic, with no pay-to-win or mandatory grinding. Story beats in briefing and results: Giữ đèn lên → Bơm chạy lại → Hạt Tim nảy mầm.

## Results and replay

Stars: one for victory, one for finishing with at least 2 core HP, one for using a wet Orchid to hit at least three enemies in one pulse during that winning attempt. Stars gate nothing. Record best stars and shortest victory time separately. Defeat screen identifies first lane to breach and the last breach that caused defeat and offers instant retry. The ending shows the Heart Seed bloom with a skippable 3 s animation, credits and campaign summary. The map uses exactly three cards. Game settings: master, music, SFX, mute, reduced motion; non-color wet and immunity indicators; documentation in Vietnamese. Keep no backend, account, purchases, multiplayer, or extra campaign stages.
