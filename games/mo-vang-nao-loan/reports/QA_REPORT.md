# Mine 1 browser QA

Candidate runtime tested at `3cca41749a5085362d8605861ee87eff72abadf4`, based on GitHub main `ffc924d799d593a9918d079e9cb11daf62f94451`. Playwright drove Space and touch in Chromium 156.0.8078.79 on the assembled static site under `/ai-game-studio/`. The QA adapter supplies the seed and layout and reads events. The hook uses the built runtime's regular input and simulation.

## Eight-second scenario

Times are gameplay elapsed seconds from scenario start to the payout, including aiming and travel. The result resolved once at 8.00 s in each run.

| Route | Space, 1366 × 768, 16.7 ms median frame | Touch, 390 × 844, 33.3 ms median frame | Result |
| --- | ---: | ---: | --- |
| Two small nuggets | 7.27 s | 7.30 s | PASS · +100 and +100 |
| Deep chest, cash seed | 6.19 s | 6.22 s | PASS · +350 |
| Deep chest, supply seed | 6.18 s | — | FAIL in game · supply and +0 |
| Deep chest, rock seed | 6.18 s | — | FAIL in game · +15 |

The two-nugget route banked its first 100 at 3.83 s with both input methods. At timeout with a catch still on the rope, the 400 starting balance stayed unchanged. Retry restored the layout, starting wallet and deterministic rock outcome. [Cast, latch and bank events](evidence/browser-timings.json)

## Production verification

| Check | Result | Observation |
| --- | --- | --- |
| Canonical Pages assembly and verifier | PASS | Canonical registry and existing public routes built cleanly. Mine 1 is outside the canonical registry pending Studio review. |
| Mine 1 production catalog rehearsal | PASS | Real portal build and Pages assembler with temporary catalog registration. Catalog launch, cover, direct entry and return succeeded. The normal production entry omits fixture data. |
| Fresh normal shift | PASS | Direct production entry banked the first 100. The observed 75-second fresh run banked 640 across four guaranteed nuggets and waited for the clock to resolve. |
| Shop and progression | PASS | Space scan, held Space rejection, supply purchase, reload, affordability, touch skip, timed buffs, cut, snapshot recovery and replay. |
| Responsive and settings | PASS | Desktop action and mobile shop exit visible in the viewport. Mobile shop targets are at least 44 CSS pixels. Sound and motion preferences persisted. Hide/resume and timeout checked. |
| Lint, types, unit and validator suites | PASS | Studio lint, Studio and game type checking, 50 Studio tests and 12 pack validator tests. The original pack's format rejection is recorded separately. |
| Live Pages, physical phone and Producer G2 | NOT_RUN | Catalog registration and human playtest are pending. The 30 fps run used Chromium touch emulation on the test host. The live URL was inaccessible through the network proxy. |

Across the game browser checks there were no page exceptions, console errors or failed asset requests. Initial game files totaled 76,361 bytes raw. The estimate is 40,807 bytes with gzip for text and existing compression for PNGs. No external font, audio or art requests. [Desktop mine](evidence/mine-one.webp) · [Mobile shop](evidence/mobile-shop.webp)
