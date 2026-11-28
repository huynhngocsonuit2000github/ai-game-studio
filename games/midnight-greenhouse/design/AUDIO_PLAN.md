# Audio direction

Rain on glass, restrained felt-key melodies, machine textures and a clearly legible combat mix. The pack supplies original synthesized Ogg Vorbis exports rather than third-party loops. Use files listed in the asset manifest. Music opens quiet and ominous; add the storm/pressure layer for major waves and the boss. Use optional short runtime UI accents only if consistent with existing clips. Radio-like thunder is quieter than warnings and attacks.

| Cue | Trigger |
| --- | --- |
| `ambient-rain` | Quiet loop for stage; lower volume during briefing. |
| `music-watch` | Loop during ordinary waves with crossfaded entry. |
| `music-storm` | Loop during final waves or boss, replace watch at quiet bar boundary or short crossfade. |
| `plant`, `fern`, `root`, `shock`, `pod` | Report a real placement or attack, never just a click on a disabled tile. |
| `water`, `warning`, `valve-lock`, `breach` | Confirm successful reroute, predicted high threat, active lock or core breach independently. |
| `victory`, `defeat` | One-shot result stingers. |

Initialize audio from a player gesture. Use decoded buffers or lifecycle-bounded HTMLAudio with clear recovery when unavailable. Use a master gain with independent Music/SFX and mute. Limit simultaneous SFX to eight, aggregate identical hits within 90 ms, and give locks/breaches priority. Avoid restarting music on every menu repaint. Pause/hidden suspends beds, resume from user gesture. Verify no double playback after retry and no loop clicks or clipping in a real browser. Suggested defaults: Master 70%, Music 35%, SFX 65%; ambience lies on Music bus at a lower asset mix level.
