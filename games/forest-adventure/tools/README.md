# Rebuild and check assets

Use Python 3 with Pillow, NumPy and SciPy and an FFmpeg build with libvorbis/AAC plus ffprobe. The build/reference scripts resolve assets relative to the game folder. On Debian, the title artwork uses DejaVu fonts under /usr/share/fonts/truetype/dejavu. Asset files are checked in so these tools are optional at gameplay build time.

    python tools/build_art.py
    python tools/build_audio.py
    python tools/build_reference.py
    python tools/validate_pack.py

The validator checks asset binary decodes, frame rectangles and pivots, clip names, audio lengths/levels, loop sample endpoints, level geometry, and one manifest row per runtime file. It refreshes the CSV and asset-validation.json. Regenerating art or audio with different encoder versions may change checksums. Confirm producer review on generated changes.
