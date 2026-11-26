# Forest Adventure 2D 0.1.0 release notes

Release candidate prepared on 2026-11-27. The Producer accepted the campaign gameplay under D13. The Studio catalog remains In Development while the release checks are open.

Guide Pip through Fernlight Trail, Willow Run and Lantern Oak. Collect three Heartseeds per trail to open its portal, and look for eight optional fireflies on each trail. Lantern checkpoints retain collectibles after falls and defeats. Continue resumes at the start of the latest unlocked trail, and each trail saves its best time and firefly count. Use A/D or the arrow keys to move, Space/W/Up to jump, and Esc to pause. The game includes keyboard menus, reduced motion and separate volume controls.

The release keeps the existing Studio game ID, entry, cover path and save key. A locally assembled Released fixture passed the project-subpath catalog, direct-entry, campaign clear and return paths. The existing public preview still resolves at `/ai-game-studio/games/forest-adventure/index.html`. Media sources and notices are in the [rights review](../assets/source/PROVENANCE.md).

## Promotion and rollback

Complete the open release evidence in the [QA report](../reports/QA_REPORT.md). Then set only `forest-adventure.status` to `released` and `forest-adventure.milestone` to `S06 · Released`. Submit the exact release head and changed-path list as an `approvedHeads` entry in a dedicated Studio scope PR. A reviewer must merge that grant into trusted `main` before the release check can accept those fields. The release PR needs a separate manual merge. After deployment, verify the published commit marker, live campaign, save, and Back to Studio route.

The last verified public preview before this candidate is `95cdbb639594a0685490a16e3549589905c66375`. If a released revision fails, prepare an authorized revert PR that restores the last working artifact and retains the public game ID and entry. Rebuild the full site, rerun the subpath checks, and verify the published revision again. [Studio Pages runbook](../../../deployment/README.md)

## Public campaign development preview

D14 authorizes the three-trail development preview while the remaining release evidence is gathered. The existing catalog entry serves the campaign through **Play preview** using the standard Pages build and the current v1 save. Formal promotion still follows the process above. Verify the published SHA and full campaign after the preview PR is manually merged.
