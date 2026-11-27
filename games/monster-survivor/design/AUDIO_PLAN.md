# Audio

Original mono PCM cues and loop compositions are in `assets/runtime/audio/`. `audio.json` is the file and sample-frame map. Source synthesis score included under `assets/source/audio-score.py`. The runtime consumes the exported WAV files only. All files are 24,000 Hz, signed 16-bit, mono. The pack uses exact loop sample frames rather than codec offsets.

| State | Music | Transition |
| --- | --- | --- |
| Title | Moonlit Gate, bell-and-wind motif | Starts only after first valid user activation. |
| Combat | Through the Garden, layered plucks and soft pulse | Fade title 450 ms and start if unlocked. Crossfade boss over 750 ms. |
| Boss | Warden Toll, darker short rhythm | Starts after spawn stinger. Keep warnings audible. |
| Reward / Pause | Keep loop position | Reward ducks to 42%, pause ducks to silence and suspends or freezes playback; apply short ramp to avoid pops. |
| Results | Victory or defeat stinger | Fade combat and stop loop. Title restart restores title loop. |

Cue priority: boss/telegraph/ward/level/guard break above hurt, dash and loot; hits and spell projectiles lowest. `dart`, `impact`, `xp`, `dash`, `hurt`, `level`, `select`, `ward`, `telegraph`, `bell`, `bloom`, `shield`, `meteor`, `elite`, `boss-arrival`, `win`, `lose` are supplied. Use a 12-voice total SFX cap, min gap 65 ms per common cue, and aggregate pickup clusters to one cue per 110 ms. A critical cue may preempt an ordinary voice; no stealing from a recent critical one. Music source max two during crossfade. Default master/music/SFX 0.8/0.55/0.72. Mute persisted. Decode a track lazily and cancel stale transitions when loading finishes out of order. Low HP does not emit repeated alarm loops.

Validate each WAV decode and frame metadata. Listen to loop boundary, music joins, loudest combined cue moment and mute/unmute. QA confirms user-gesture gating, no stuck voices after three retries, boss telegraph audibility under load, and clear mute persistence. Running silently is a supported mode and conveys all game-critical information.
