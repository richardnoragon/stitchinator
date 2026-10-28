# Architecture

Current source architecture, as of the initial Git snapshot on 2026-10-28.

## Runtime

A single Rust/Axum process serves embedded HTML/CSS/JavaScript and JSON APIs. The frontend uses browser ES modules, canvas and SVG without a runtime frontend framework or remote assets. Docker runs the process as an unprivileged user and publishes only a loopback port. There is no user login or hosted cloud service.

Runtime OCR invokes local Poppler/Tesseract subprocesses from bounded temporary directories. Extraction is size/page/time limited and produces reviewable text, not an automatically approved pattern. Docker installs the OCR utilities and English/German data; native installations must provide them.

## Backend modules

| Module | Responsibility |
| --- | --- |
| `src/main.rs` | Runtime initialization, local-request protections, embedded assets and routes, basic swatch estimates |
| `src/library.rs` | Independent project files, migration from the early single-project store, optimistic write versions |
| `src/backup.rs` | Full/incremental collection snapshots, checksums, retention, safety backup, staged restore/recovery |
| `src/inventory.rs`, `consumption.rs`, `reservations.rs`, `yarn_plan.rs` | Stock, actual-use ledger, reviewed commitments and shape/band estimates |
| `src/patterns.rs` | Append-only shared picture-pattern library and unique-name enforcement |
| `src/amigurumi.rs` | Offline PDF/photo text extraction with temporary-file cleanup and time limits |

## Frontend modules

`web/app.js` coordinates project state, editing, explicit previews and autosave. `project-model.mjs` validates and migrates data, exposes active-piece views and constructs exports. Feature modules own chart instructions, radial construction, snapping geometry, patterns, photos, quantities/progress, yarn accounting, assembly/folds, revisions, backups and export previews.

`amigurumi-model.mjs` owns round parsing/counts, profile geometry and mesh serialization; `amigurumi.mjs` owns its workspace, reviewed imports, references, views and document exports. Its full-round model is separate from the earlier radial sample chart. Stitch-level geometry is procedural and does not simulate physical yarn or stuffing.

## Data and transactions

- Project schema 2 stores project metadata, shared definitions and multiple piece designs. Legacy schema 1 migrates into a main piece when read.
- Runtime files live under `STITCHINATOR_DATA` (Docker `/data`), with each project in `projects/<id>.json`.
- `_inventory.json` holds shared stock/consumption. `_patterns.json` holds user-saved shared picture patterns; bundled starters come from source JSON. Neither appears as a project.
- A process-wide save lock and version checks prevent stale-tab overwrites. File replacements use staged writes/renames. Inventory usage and physical stock are updated atomically.
- Named revisions preserve design milestones; operational progress and consumption are deliberately not rewound by design revisions.
- Shared picture entries are append-only: edits create a separate entry with a unique new name. Imports into projects are independent snapshots.
- Project files retain a 2 MB limit. Embedded references, photos and revisions count toward it. The shared picture collection has its separate 16 MB limit.

## Backups and recovery

A prepared host backup folder is separate from the container and data volume. Initial/monthly full snapshots and daily incrementals retain three complete monthly cycles. Checksummed chains include projects, inventory and shared patterns. Restore validates the chain, requires a safety backup, stages a replacement collection and advances versions so stale tabs fail. Backups are unencrypted; destination loss warns and retries rather than disabling editing.

## Boundaries

No cloud sync, physical cloth simulation, automatic arbitrary crochet correctness or validated amigurumi yarn estimates are claimed. Exact-size rounding and deletion/Trash policy remain owner decisions. Windows/macOS host packaging and real craft measurements require acceptance work. See [roadmap](ROADMAP.md), [testing](TESTING.md) and [user guide](USER_GUIDE.md).
