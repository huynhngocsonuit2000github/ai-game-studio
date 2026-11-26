# Audio plan

Original synthesized woodland motif at 108 bpm, 16 bars. Fernlight and Willow reuse the bright cue; Lantern Oak restates the motif with lower flute-like lead. Quiet birds and wind use a separate ambient stem. Each cue ships as Ogg Vorbis and AAC M4A, 44.1 kHz. Only load one supported codec per cue. Clips, PCM loop lengths and levels are in assets/runtime/audio/cues.json. Implement Web Audio decoded-buffer loop points from the metadata; compare decoder lengths. Safari AAC encoder padding can shift boundary. If a device exposes padding, set the loop end to the corresponding decoded musical length after listening or use an adequately pre-rolled/crossfaded player path. Measure first, keep a graceful muted fallback.

| Group | Events | Relative initial gain |
| --- | --- | --- |
| Score | fernlight-theme on first two levels, lantern-oak-theme on L3 | 0.40 |
| Ambience | forest-ambience under gameplay | 0.24 |
| Traversal | jump, land, stomp, fall, hurt | 0.60 |
| Rewards | firefly, seed, lantern, gate, clear | 0.72 |
| UI | hover, confirm, resume | 0.40 |

Master defaults to 0.70, music 0.75 and SFX 0.85, multiplied by group gain. Fade score on state transition (220 ms) and duck on clear cue. Cap playback to 8 simultaneous effects, prioritizing cues for damage, checkpoint, unlocked gate and clear. Rate-limit hover and footfall bursts, never replay a pickup whose ID is already owned. Suspend gameplay buses on pause/tab hide and explicitly resume. Apply group gains and measure total peak below −1 dBFS. Audio QA requires sound heard on supported browsers, seamless loops at two wraps, instant mute and no duplicate voices after pause/restart.
