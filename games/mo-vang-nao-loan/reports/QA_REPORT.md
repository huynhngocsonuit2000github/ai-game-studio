# Mine 1 browser QA

Record for MVNL-001, based on GitHub main `ffc924d799d593a9918d079e9cb11daf62f94451`. The game and timing tests use Chromium against the assembled artifact under `/ai-game-studio/`.

- Space and touch each independently cleared the two-gold and cash-chest routes. Timings are gameplay elapsed time from scenario start until credited delivery, including aiming and reel. Result resolved once at 8.00 s.
- The complete normal run banked 640 gold from four guaranteed nuggets and resolved at 75.00 s. Shop prices, inventories, scanning Space controls, retry and save/reload are exercised in the browser suite.
- Production flags disable scenario injection. The browser suite supplies fixture data through its own entry adapter and imports the deployed game modules unchanged.
- Physical phone performance, live Pages and Producer playtest are pending.
