# Audio direction

Original marimba and garden percussion accompany the refreshed campaign. Music crossfades into the later waves. The audio manifest gives source, rights and format. [Art and audio target](retro/ART_TARGET.md)

| Cue | Trigger |
| --- | --- |
| `retro/courtyard` | Ordinary-wave loop after the first player gesture. |
| `retro/rush` | Crossfade into wave 5 and later pressure. |
| `retro/collect`, `retro/shield-chip`, `retro/bell`, `retro/unlock` | Successful token credit, actual frontal hit on Porter, first intercepted breach and Orchid availability. |
| `plant`, `fern`, `root`, `shock`, `pod` | Report a real placement or attack, never just a click on a disabled tile. |
| `water`, `warning`, `valve-lock`, `breach` | Confirm successful reroute, predicted high threat, active lock or core breach independently. |
| `victory`, `defeat` | One-shot result stingers. |

Initialize audio from a player gesture. Use decoded buffers or lifecycle-bounded HTMLAudio with clear recovery when unavailable. Use a master gain with independent Music/SFX and mute. Limit simultaneous SFX to eight, aggregate identical hits within 90 ms, and give locks/breaches priority. Avoid restarting music on every menu repaint. Pause/hidden suspends beds, resume from user gesture. Verify no double playback after retry and no loop clicks or clipping in a real browser. Suggested defaults: Master 70%, Music 35%, SFX 65%. Legacy audio exports document the earlier candidate.
