# Rebuild and check assets

Use Python 3 with Pillow, NumPy and SciPy and an FFmpeg build with libvorbis/AAC plus ffprobe. The build/reference scripts resolve assets relative to the game folder. On Debian, the title artwork uses DejaVu fonts under /usr/share/fonts/truetype/dejavu. Asset files are checked in so these tools are optional at gameplay build time.

    python tools/build_art.py
    python tools/build_audio.py
    python tools/build_reference.py
    python tools/validate_pack.py --check

The validator checks the source PNGs and prompt mapping, static art targets, runtime media decodes, frame rectangles and pivots, clip names, audio lengths/levels, loop sample endpoints, and level geometry. The `--check` mode compares runtime hashes, sizes, paths and source records to the checked-in manifest without writing files. Run without `--check` to refresh the CSV and asset-validation.json after an approved asset change. Regenerating art or audio with different encoder versions may change checksums.

From the monorepo root, run the S00 registry draft checks with the pinned Node version.

    node --test games/forest-adventure/tools/validate_registry.test.mjs
