# Catalog contract

The root must have `schemaVersion` set to `1` and a `games` array. Each entry requires an immutable, unique lowercase kebab-case `id`, nonempty `title`, `description` and `version`, and these fields.

| Field | Values |
| --- | --- |
| `engine` | `phaser`, `three`, `other` |
| `status` | `planned`, `development`, `released`, `archived` |
| `visibility` | `development`, `public` |
| `entry` | Unique relative runtime path, or `null` before a verified runtime exists. Required for released games. |
| `cover` | Relative cover path or `null` |
| `categories` | Optional, up to eight distinct category names of up to 40 characters |
| `dimension` | Optional, `2D` or `3D` |
| `featured` | Optional boolean. The first flagged eligible release in registry order takes precedence. |
| `milestone` | Optional nonempty milestone label |

Use letters, digits, dots, underscores and hyphens in path segments. The validator rejects empty segments, traversal, absolute paths and URL syntax. The ID `studio` is reserved. Portal routes are derived from IDs.

The public library lists only public released entries. The production portal and Pages artifact include only public releases. Public entries and covers must resolve inside `games/<id>/`. Previously public entry paths are retained across builds. The production registry currently contains zero games.


The Studio reviews editorial metadata under the existing change-scope policy. Entries with missing categories or format appear in the unfiltered library. The local portal also lists planned and development entries. Register a relative entry only once a playable build exists.
