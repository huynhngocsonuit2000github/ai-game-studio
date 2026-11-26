# S06 — Release

Dependency: S05 accepted, recorded Producer approval for release, rights and public visibility. Player outcome: playable verified deployment from the Studio library.
- S06-1 Apply authorized registry release fields, complete full Pages assembly and preserve previous public IDs. Stage a rollback and identify last good version.
- S06-2 Verify actual published commit after authorized manual merge. Record public URL, live gameplay, deployed SHA and rollback steps. If deployment fails, keep the previous stable build and report exact check failure.
- Assets: checked manifest, cover, paid-free production bundle and license notices.
- Acceptance: Q17 passes on candidate and deployed smoke when authorized. Keep stage candidate until live checks and Producer acceptance complete, record exact SHA both times. Zero P0/P1.
- Preview: candidate remains playable before merge. Automatically create/update one release PR; do not merge automatically.

## Combined S05–S06 result

S06-1 passed local Pages assembly and catalog, direct-entry and return smoke. A clean rebuild of main at `e8c20fb6ed114d8e2a25177ad967b4b5deb2ca4c` supplies the rollback baseline. Its public manifest matches the candidate and the existing Forest Adventure entry is preserved. For a faulty future release, create a revert PR, rebuild and smoke-test the complete site before authorized merge, then verify the replacement commit marker and game route.

S06-2 awaits campaign media clearance, trusted Studio authorization, Producer approval and an authorized merge. After deployment, verify `build-sha.txt` against the merged revision, launch through the live catalog and direct entry, complete representative play, and follow Back to Studio. Record the deployed SHA, build, route and result. See the [QA report](../../reports/QA_REPORT.md) for the local artifact and checks.

## Final release checkpoint

D13 records Producer gameplay acceptance and conditional publication authorization. Source reproduction and artifact media verification passed. The verified Studio Pages revision `95cdbb6` served the S01 preview. The full campaign passed local production assembly using a Released registry fixture. The final release PR remains blocked on the mandatory QA evidence and trusted exact-head scope grant. See the [release notes](../../production/RELEASE_NOTES.md) and [QA report](../../reports/QA_REPORT.md).
