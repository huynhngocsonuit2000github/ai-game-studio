# Source provenance

- Pack records describe nine original AI-generated bitmap masters made for Forest Adventure. Each PNG matches a prompt in [artwork-prompts.json](artwork-prompts.json) and a source path in the [manifest](../../production/ASSET_MANIFEST.csv). The pack records `hero.png` as the character reference for `motion.png`.
- [build_art.py](../../tools/build_art.py) crops and transforms the masters for the atlases, backdrops and promotional art. It creates the panels, icons and particles procedurally and uses system DejaVu Serif Bold and DejaVu Sans to rasterize cover and banner text. The pack contains rasterized text and no font files. [DejaVu font license](https://dejavu-fonts.github.io/License.html)
- tools/build_audio.py defines the original score, cues and synthesis. It uses generated waveforms and contains no recordings, samples, MIDI or external music.
- No third-party game asset packs are listed in the manifest. S00 matched the source masters to prompts and verified the supplied runtime hashes.

## Public S01 development preview

On 2026-11-26, the Producer confirmed that the original Forest Adventure artwork was generated through their ChatGPT Work session and authorized publication of the artwork, sprites, backgrounds, UI assets and cover in the public S01 development preview. The OpenAI Terms of Use assign OpenAI's interest in output to the user, subject to applicable law and the terms' separate treatment of third-party output. The Producer's authorization applies to the 16 S01 visual files and associated data identified in the [asset manifest](../../production/ASSET_MANIFEST.csv). It grants publication on Studio Pages for this preview. [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/)

- DejaVu Serif Bold and DejaVu Sans are build-time typography used for raster lettering. The cover distributes pixels, with no font software in the game build. [DejaVu license](https://dejavu-fonts.github.io/License.html)
- Phaser 3.90.0 and eventemitter3 5.0.4 are MIT-licensed. The game build includes their applicable notices as `phaser-license.txt` and `eventemitter3-license.txt`, copied from the pinned packages.
- The S01 build excludes audio, source masters, concept art and unused campaign art. Clearance for future stages and general asset reuse remains outside this approval.
