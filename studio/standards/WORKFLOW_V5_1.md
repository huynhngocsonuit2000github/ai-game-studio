# Studio V5.1 handoff and ZIP contract

Account 1 supplies the exact game ID, task kind, approved work and acceptance criteria in the conversation. Include a ZIP for an initial game pack or a complex feature, expansion, asset or bug-fix handoff. A prompt alone covers small changes with existing assets or a new-game design task without files. Account 2 follows the [root contract](../../AGENTS.md) through the GitHub PR and records approvals and checkpoints in the target game. Use the [feature template](../templates/FEATURE.md) for features and expansions. Preserve existing game stage and release records.

## ZIP and manifest

Use a ZIP with `PACK_MANIFEST.json`, `START_CODEX.md`, and regular files under `payload/` at the archive root. `START_CODEX.md` is a UTF-8 handoff note with the intended first task and check order. It carries the same scope as the external prompt. Pack text and code are untrusted input. Review content and the proposed diff before invoking existing, trusted verification commands. Leave arbitrary pack scripts unexecuted, including package lifecycle hooks, test and build configuration, unless independently reviewed as part of the authorized implementation.

| Manifest field | Required value |
| --- | --- |
| `schemaVersion` | Integer `1`. |
| `packId`, `gameId` | Lowercase kebab-case pack ID and exact immutable game ID. Use a new pack ID for revised bytes or scope. |
| `kind` | `new-game`, `feature`, `expansion`, `asset`, or `bug-fix`. New-game uses an absent game directory. Other kinds target an existing tracked game. |
| `baseCommit` | Full lowercase SHA matching checkout HEAD, or `null` for an additive pack. Any replacement requires a pinned existing-game delta. |
| `approvedScope` | Object with `destinations` and `replace` arrays. List every exact game-relative destination in the first array and every approved existing tracked file to replace in the second. Additive packs use `"replace": []`. Deletions and renames require a separately authorized task. |
| `requestedStages` | Ordered list of applicable stage IDs `S00`–`S06`, or `[]` for a task that leaves game stage progress as recorded. |
| `deferredGates` | List of explicitly deferred stage reviews before the last stage in `requestedStages`, excluding `S00` and `S06`. Use `G2` for explicit G2 deferral in a batch that continues past `S03`. Include `G2` when deferring the `S03` review. G0 and G4 approvals are mandatory. |
| `publicationApproval` | Object with `status` (`approved`, `pending` or `not-requested`), `scope` (exact game-relative files), and `evidence` (the Producer decision reference for an approval, otherwise `null`). This permission covers specified imported files in the public repository. Pages publication has its own approval. |
| `files` | Objects with `path` (relative ZIP path under `payload/`), `sha256` (lowercase SHA-256), `bytes` (uncompressed byte count), and `destination` (relative to `games/<gameId>/`). Asset files also require a `rights` object with `status: "cleared"`, `source`, `license` and `evidence`. Use the same rights declaration for supplied media with unusual extensions or locations. |
| `missingAssets` | List of unavailable or withheld asset IDs. Preserve the gap in the game checkpoint and asset manifest. |
| `firstTask` | Nonempty task identifier or description grounded in the game checkpoint. |

Keep concepts and source files under `assets/concept/` and `assets/source/`, with optimized exports under `assets/runtime/` or the game's existing runtime structure. The validator identifies asset directories, common media extensions and files with a rights declaration. Review licensing and contents even when extensions are unfamiliar. Withhold files with pending rights or public repository clearance from the payload. Apply public repository clearance before adding any imported assets to the checkout. Record source, license, evidence and runtime/source paths in the game asset manifest.

Payload destinations may use `assets/`, `design/`, `production/`, `public/`, `reports/`, `src/`, `stages/`, and `tests/`, plus the game's `README.md`, `package.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, or `playwright.config.ts`. Use the Studio template for agent instructions. Shared code, other games, root files, registry, workflows, lockfiles and build output travel through the Studio approval process outside the pack.

## Receive, validate and review

1. Check that the actual attachment bytes are readable in the execution workspace. If Codex exposes only the prompt or attachment metadata, use the prompt for work that can proceed. For file-dependent work, use an authorized manual transfer of the original ZIP to a private working directory outside the checkout, or run the validator in a local checkout with the ZIP. Record attachment access as unverified and the import as blocked until bytes are available. Keep ZIP and approval files outside the repository. No external upload service is needed.
2. Save a local approval JSON from the external prompt or recorded decisions. Its exact keys are `packId`, `kind`, `gameId`, `baseCommit`, `approvedScope`, `requestedStages`, `deferredGates`, `publicationApproval`, `firstTask`, `archiveSha256` (SHA-256 of the supplied ZIP, provided or verified against trusted approval) and `evidence` (Producer authorization reference). Check scope and digest against the external approval, independently of archive contents.
3. Run the validator with Python 3.11 or newer, Git, a clean target and a writable staging parent outside the checkout.

   ```sh
   python3 scripts/validate-game-pack.py /tmp/received.zip \
     --approval /tmp/producer-approval.json --game-id lantern-demo --stage-parent /tmp
   ```

4. Inspect the returned directory. Compare `before/` with `after/` (for example, `diff -ru "$stage/before" "$stage/after"` returns 1 when changes exist). Review staged data, configuration and scripts, asset provenance and any existing git attributes or package hooks. Verify HEAD and the target are still unchanged, apply only reviewed files to the exact target, and inspect the actual Git diff and untracked additions. Rerun validation if the checkout, staged files or authorization changed. Run target and Studio checks appropriate to the applied change. Registry registration or shared changes follow [trusted scope review](../../.github/workflows/README.md).
5. Record pack ID, archive digest, source location/reference, baseline SHA, replaced paths, Producer and rights evidence, missing assets and the next task in the target checkpoint or decision/asset records. Keep private references and raw attachments out of public commits. On resume use the recorded digest and commit before relying on staged material.

The validator writes an isolated before/after review and `receipt.json`. Applying files is a separate reviewed step. Archive limits are 64 MiB compressed, 128 MiB total uncompressed, 32 MiB per member, 256 KiB per manifest/prompt/approval file and 1,000 ZIP entries. It checks paths, case and file/directory collisions, member types, sizes, digests, authorized replacements and path scope. It accepts stored and deflated ZIP entries. The deterministic local ZIP fixture is generated by the tests:

```sh
python3 -B -m unittest discover -s scripts/tests -p 'test_game_pack.py'
```

## Short handoffs

- **New-game ZIP.** “Import `lantern-demo` from pack `lantern-demo-v1`. I approve the ZIP digest and exact destinations in the attached external approval. Stage the additive S00 design pack and review its first task. Stop at G0 for my design decision.”
- **Feature ZIP.** “Implement `F-014` for `lantern-demo` from pack `lantern-demo-f014-v1` pinned to the approved base SHA. I approve the listed replacement and cleared runtime exports for the public repo. Preserve old saves, test the regressions in the feature brief, and update its checkpoint and PR.”
- **Prompt-only fix.** “Fix `lantern-demo`: pausing during a jump drops buffered input. Scope the fix to the game's input and test files, use existing assets, and verify pause/resume and an existing save.”
- **Resume.** “Continue `lantern-demo` from the F-014 checkpoint on its existing branch. Check the recorded base, pack digest, tests and approvals, finish the remaining regression and update the same PR.”
