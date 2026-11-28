# Nhà Kính Sau Nửa Đêm

Original 2D single-player web lane defense. You are the night gardener of a rooftop greenhouse. Fungal gardeners have climbed the stairs to steal the Heart Seed. Plants hold the aisles while you redirect one water supply. Vietnamese is the only required player-facing locale. Campaign: exactly three authored stages, approximately 15 active minutes for a practiced clear, with additional planning time for a first clear. Sessions are playable with mouse, keyboard or touch in landscape.

## What the player does

Read the next wave, plant a formation, collect Ánh Hạt and reinforce the threatened lanes. In Sân Mưa, place a Dương Xỉ in the flagged lane and collect a nearby drop. Lan Sét becomes available at the third wave warning. The next stage introduces water as an Orchid chain boost and a way to recover damaged Moss. Physical attacks, economy and control compete for the same slots. Normal mode supports an economy-first or two-Fern opening. [Refresh design](retro/REFRESH.md)

## Board, input and flow

Four lanes numbered 1–4 from top to bottom, eight plant slots per lane. Col 1 is at the core; enemies enter through the right at x=8.45 in tile units and breach at x=−0.35. One unit per tile; adjacent tiles and enemy occupancy are checked before cost is deducted. Visible lane buttons at the left show wet status, time to reroute, reason unavailable and a shape marker. Select a card and click or tap an empty tile to plant. Preview cost, target range and validity. Support keyboard focus through controls, arrow navigation on the board, Enter/Space to apply, Escape to cancel or pause, and digits 1–6 for cards when focus is outside a control with its own key handling. Move focus to the result dialog after win/loss and return focus on close. Right-click or Escape cancels an active plant cursor; a visible Tháo cây tool works on touch and gives a 25% refund rounded down. Invalid actions never drain stock, card charge, or water cooldown. Ignore global shortcuts while typing or when a modal owns focus.

Chơi on the title opens the next uncompleted stage directly, with six seconds of preparation. The illustrated map offers previews and replay, and the Sổ tay can be browsed before the first match or through pause. Time and stock stay fixed while paused. Return to map warns before dropping an active attempt. The game saves stage results and settings changes. The campaign schedule starts when preparation ends. Chuông Gốm absorbs the first ordinary breach and briefly stuns ordinary enemies in that lane. Keeper bypasses the bell and breaches for three core HP. Defeat takes precedence when the core reaches zero, and victory requires all scheduled waves and surviving enemies cleared. Retry restores the preparation state.

## Economy and water

Ánh Hạt is integer stock. The first six ambient drops are worth 28 each and later drops are worth 16. Bình Hứng drops 18 every ten seconds without water, with a cap of three live collectors. Three eligible elites may drop a small bonus subject to the on-field cap. Tap a drop, use Thu Ánh Hạt or S to collect in bulk, or wait three seconds for automatic full credit. Sân Mưa has no valves. In Hầm Bơm and Đài Chớp, water may be routed once per three seconds and gives wet Orchid extra targets and Moss regeneration.

## Plants

The six cards use the IDs in `TUNING.json`. All attackers face right and target only enemies ahead in their own lane unless explicitly specified. Cooldown clocks hold a ready action if there is no legal target. A new placement is ready immediately except collectors, Orchid and Pod. Attack cooldowns are per specimen and placement cooldowns are per card ID. Each plant has a unique animated action and sound.

| Plant | Role and rules |
| --- | --- |
| Bình Hứng Mưa | Releases a token on its payout schedule. |
| Dương Xỉ Nảy | Reliable physical lob within the range in TUNING.json. Selects the closest target ahead that still needs damage after incoming Fern shots. If shielded, the arcing shot ignores frontal armor. The firing windup is included in the attack cycle. Hit uses chosen target if still alive and in lane, otherwise fizzles. |
| Gai Cuộn | Short-range physical poke and root for 1.45 s on non-bosses. Repeat roots refresh to the longer remaining duration. Roots stop movement only; adjacent enemies may still attack. Boss receives 25% slow for 1.0 s, no root. |
| Lan Sét | Dry: one additional susceptible target. Wet: up to three additional susceptible targets in the same lane, in increasing x order and within the tuned jump range. Raincoats block selection and chaining, immune to shock and skipped when looking for a susceptible target. Physical sources remain effective. |
| Rêu Thành | High-HP wall with no attack; slow regeneration while wet after 4 s without damage. Occupies one tile and blocks while alive. |
| Lựu Cầu Chì | Arms, then detonates once when a live enemy enters within 0.8 tiles of its tile center. Physical AoE within 1.4 tiles in own lane only, consumes the plant. If destroyed before arming, fizzles. No serial automatic replant. |

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
| 01 · Sân Mưa | The first night watch. Six waves, core 3 HP, three starter plants plus the Orchid reveal, first threats enter lane 2. | Learn placements, token economy, dry shock and the warning strip. Two of the last three waves add armored or insulated pressure in another lane. |
| 02 · Hầm Bơm | Six waves. Unlock Rêu Thành. Pump faults close only one wet route at a time; raincoat and healer combinations arrive. | Route around outages, use walls to buy time for a physical lane, split your economy across two sides. |
| 03 · Đài Chớp | Seven waves. Unlock Lựu Cầu Chì. Scheduled faults and a seeded authored convoy and Thợ Vườn Gốm. | Plan the boss lane while other lanes demand coverage. Use the boss tell to move water ahead of a lock or leave it committed to win the current combo. |

`TUNING.json` is the canonical runtime data, with exact wave times, lane IDs, group cadence, hazard events and budgets. Tune values after real clears and keep the final checked-in data and documentation consistent. Avoid long periods with nothing to act on. Pins and prep times are deterministic, with no pay-to-win or mandatory grinding. Story beats in results: Giữ đèn lên → Bơm chạy lại → Hạt Tim nảy mầm.

## Results and replay

Stars: one for victory, one for finishing with at least 2 core HP, one for hitting at least two enemies with one Orchid pulse in Sân Mưa or at least three in a later stage. Stars gate nothing. Record best stars and shortest victory time separately. Defeat screen identifies first lane to breach and the last breach that caused defeat and offers instant retry. The ending shows the Heart Seed bloom with a skippable animation, credits and campaign summary. The map uses exactly three cards. Game settings: master, music, SFX, mute, reduced motion; non-color wet and immunity indicators; documentation in Vietnamese. Keep no backend, account, purchases, multiplayer, or extra campaign stages.
