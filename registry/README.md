# Catalog contract

The root must have `schemaVersion` set to `1` and a `games` array. Each entry requires an immutable, unique lowercase kebab-case `id`, nonempty `title`, `description` and `version`, and these fields.

| Field | Values |
| --- | --- |
| `engine` | `phaser`, `three`, `other` |
| `status` | `planned`, `development`, `released`, `archived` |
| `visibility` | `development`, `public` |
| `entry` | Unique relative runtime path, or `null` before a verified runtime exists. Required for released games. |
| `cover` | Relative cover path or `null` |

Use letters, digits, dots, underscores and hyphens in path segments. The validator rejects empty segments, traversal, absolute paths and URL syntax. The ID `studio` is reserved. Portal routes are derived from IDs.

The public library lists only public released entries. Visibility is a catalog filter. The production registry currently contains zero games.
