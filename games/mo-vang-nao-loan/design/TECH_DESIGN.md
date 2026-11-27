# Technical design

The build uses strict TypeScript from the pinned workspace and emits native ES modules with relative URLs. Canvas 2D caches the cavern art and draws active objects on an 840 × 570 logical playfield. The DOM handles HUD, settings, controls and shop. There are no added package dependencies.

The browser frame loop feeds a fixed 120 Hz simulation. Casts use swept circle intersections along the cast ray. Only a loaded return that reaches the pivot by time zero can bank. The same path runs seeded fixtures through the production modules using Playwright's test-only entry adapter.

Browser storage uses version 1 snapshots under `studio.mo-vang-nao-loan.save`. Mine entry records the wallet, inventory, armed supplies, practice flag and seed. The shop saves each successful purchase and carries its updated entry forward. Retry starts from the immutable entry snapshot. Settings have their own storage key.

Targets from the approved design are 60 fps desktop, 30 fps on a representative midrange phone and under 3 MB for initial compressed transfer. The game allocates two 840 × 570 canvas bitmaps. Memory and device performance remain for physical-device QA. [Measured evidence](../reports/QA_REPORT.md)
