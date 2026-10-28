# Changelog

## Unreleased — fifteenth prototype increment

- Added radial sample charts with joined/spiral layouts, reading direction, and variable slots per round.
- Added custom-symbol painting, keyboard controls, manual positions, consumed/produced count warnings, and editable round summaries with review state.
- Preserved blocked note drafts and included radial charts/notes in PNG, document exports, revisions, and collection backups.

Local candidate: `v0.1.0-alpha.15`; not an approved release. Starting rings, joins, turning chains, shaping, and full-piece round sizing still require manual specification and validation.

## Unreleased — fourteenth prototype increment

- Added preview/Apply/Cancel for rectangle, circle, ellipse, and centered-apex triangle shapes.
- Used geometric area and actual band/shape intersections for yarn estimates and reservations.
- Updated colored mesh previews, circle diameter handling, and explicit export limitations.
- Preserved shape in revisions, portable projects, progress review, and backups.

Local candidate: `v0.1.0-alpha.14`; not an approved release. This increment provides flat shape previews and area estimates, not radial charts or round-construction instructions.

## Unreleased — thirteenth prototype increment

- Added rectangular yarn bands with independent measured fabrics, hooks, blocking state, color, and length shares.
- Added explicit percentage allocation across compatible dye lots, with coverage and compatibility checks.
- Integrated per-lot totals into Rust calculations, reservation review, previews, and exports.
- Added band editing/reordering/removal and preservation in project JSON, revisions, progress review, and backups.

Local candidate: `v0.1.0-alpha.13`; not an approved release. Bands span full piece width; stitch-level colorwork, yarns held together, and automatic gauge transitions remain outside this increment.

## Unreleased — twelfth prototype increment

- Added actual usage by project and yarn lot, corrected totals, zero-total removal, and retained change history.
- Stored stock and consumption together with atomic replacement and optimistic inventory/project checks.
- Derived remaining active commitments from approved requirements minus actual usage, without reviving released commitments.
- Preserved consumption outside design revisions and protected history from ordinary inventory edits.
- Added accounting, failed-write staging, stale-retry, correction, completion, and collection recovery checks.

Local candidate: `v0.1.0-alpha.12`; not an approved release. Usage is project/lot based; per-piece accounting and split-lot design allocation remain planned.

## Unreleased — eleventh prototype increment

- Added explicit per-piece inventory lot assignment, retained specification copies, and fresh-swatch requirement when applying yarn.
- Added project lifecycle and reviewed yarn commitments, competing-project warnings, dye-lot warnings, and visible shortages.
- Kept commitments pending explicit reconciliation after design changes; released them on completion, abandonment, or Draft.
- Protected operational state from ordinary design saves/imports and rejected stale collection approval tokens.

Local candidate: `v0.1.0-alpha.11`; not an approved release. One lot per piece; actual consumption accounting and split-lot allocation remain planned.

## Unreleased — tenth prototype increment

- Added shared personal yarn inventory with separate lot records, search, editing, metric yarn dimensions, and optional cost metadata.
- Calculated remaining meters from recorded grams and skein specifications.
- Added server-side validation and inventory version conflicts with draft download.
- Included inventory in collection backups, safety snapshots, and restoration.

Local candidate: `v0.1.0-alpha.10`; not an approved release. Allocations, reservations, and consumption accounting remain planned.

## Unreleased — ninth prototype increment

- Added independent completed-row counts and stopping notes for each piece copy.
- Preserved progress across design undo/redo and revision restoration; retained inactive copy records.
- Added design-change review warnings and explicit retain/reset controls.
- Included progress in project validation, portable JSON, and collection backups.

Local candidate: `v0.1.0-alpha.9`; not an approved release. Counts remain manual; round construction and inventory accounting are still planned.

## Unreleased — eighth prototype increment

- Extracted project validation, migration, and editor views into a dedicated module.
- Added multiple named rectangular designs per project, independent charts/swatches/instructions, and quantities.
- Added per-design yarn estimates and total project mass with missing-measurement handling.
- Extended revisions, portable projects, and backups to schema 2; blocked old-tab schema downgrades.
- Labeled selected-piece exports with name and quantity.

Local candidate: `v0.1.0-alpha.8`; not an approved release. Assembled previews, inventory allocation, and per-piece progress remain planned.

## Unreleased — seventh prototype increment

- Added initial/monthly full backups, daily incrementals, overdue catch-up, retry, and three-cycle retention.
- Added host-folder preparation and Linux local-time configuration, backup status, manual backup, and restore-point selection.
- Added SHA-256 integrity checks, dependency validation, mandatory pre-restore safety snapshots, staged collection replacement, and interrupted-restore recovery.
- Advanced restored project versions to reject stale-tab writes; added a migration marker to avoid reintroducing legacy data after restore.
- Added schedule, retention, corruption, safety-failure, interruption, and browser restore tests.

Local candidate: `v0.1.0-alpha.7`; not an approved release. Current backup implementation covers the active JSON project collection. See README for destination setup and restore limitations.

## Unreleased — sixth prototype increment

- Added independent projects with descriptions, tags, nested folder paths, and search/filtering.
- Migrated the old single workspace by copying it into the library while preserving the original file.
- Scoped saves to project IDs and added optimistic version checks to reject stale writes.
- Save-before-switch prevents leaving a project when persistence fails.
- Duplicate imports offer Open existing or Import as a separate copy without overwriting designs.
- Added migration, metadata, project isolation, duplicate import, save-failure, and version-conflict checks.

Local candidate: `v0.1.0-alpha.6`; not an approved release. Empty-folder management and deletion remain unimplemented. Refresh old tabs after downloading any unsaved edits.

## Unreleased — fifth prototype increment

- Added explicitly named design revisions and case-insensitive search.
- Restore retains history and adds before/after snapshots; revision operations start a new undo/redo session.
- Included history in local persistence and portable project files with validation against nested histories and duplicate IDs.
- Rejected duplicate names and revision operations exceeding 100 entries or the 2 MB project limit.
- Added restore, snapshot isolation, search, persistence, portable history, and malformed-import checks.

Local candidate: `v0.1.0-alpha.5`; not an approved release. Automatic backups and multiple projects remain planned.

## Unreleased — fourth prototype increment

- Added saved per-project export selections for chart/legend, picture, yarn estimates, instructions, and finishing notes.
- Added paginated preview, per-page PNG download, and browser print-to-PDF for all pages.
- Added export warnings and explicit acknowledgement for count mismatches, missing estimates/instructions, and stale instructions.
- Export snapshots use committed dimensions and freshly calculated yarn estimates; pending edits must be applied or cancelled.
- Added selection persistence, PNG, print/PDF, and pagination regression checks.

Local candidate: `v0.1.0-alpha.4`; not an approved release. PDF output is image-based through the browser print dialog.

## Unreleased — third prototype increment

- Added optional sample-chart instructions with repeated-group counts, consumed/produced totals, and explicit reading direction.
- Preserved edited instructions during design changes with per-row generated comparisons and explicit keep/replace actions.
- Preserved finishing notes and text for rows removed from the chart.
- Added gauge-based approximate sample-chart dimensions using produced stitch totals; no rounding policy is adopted.
- Added instruction logic and browser regression coverage. Instructions are optional fields in schema-1 files.

Local candidate: `v0.1.0-alpha.3`; not an approved release.

## Unreleased — second prototype increment

- Added custom-symbol drawing, SVG/PNG import normalized to PNG, and copying existing symbols.
- Added keyboard-accessible two-corner repeat-region selection and reusable region tiles.
- Added non-blocking adjacent-row consumed/produced stitch-total warnings.
- Retained schema-1 project compatibility; images are optional fields.
- Expanded Firefox and Chromium tests to cover drawing, imports, unsafe SVG rejection, repeat regions, row warnings, and image persistence.

Local candidate: `v0.1.0-alpha.2`. This is not a user-approved release.

## Unreleased — first prototype increment (2026-10-27)

Added:

- Rust HTTP server and swatch-based estimation, with input validation and calculation tests.
- Browser sample-chart editor, custom text-symbol stitches, named repeating tiles, undo/redo, and preview/Apply sizing.
- 2D shape and rotatable approximate 3D fabric preview.
- Local autosave and JSON workspace download/import.
- Docker source builds, image-archive delivery instructions, loopback-only Compose publication, and persistent volume.
- Firefox and Chromium workflow checks using isolated synthetic data.

This is an internal implementation increment, not an approved release. Broader requirements remain planned. No Git repository existed when coding began, so commit references are not yet available; create release provenance before publishing under the versioning policy.

## Explicit round construction — alpha.16

Added explicit radial starting-ring and per-round chain/join/turn choices, counted-chain totals, conflict warnings, and rule-aware generated instructions. Existing notes remain intact and are flagged for review when rules change. Legacy projects remain readable.

## Stitch placement guidance — alpha.17

Added explicit sequential radial placement, per-slot consumed/produced/net-change tables, previous-round base ranges and shortage/unworked-base warnings. Generated instructions include enabled placement and are marked stale when preceding-round output changes. Existing notes and chart geometry are preserved.

## Assembly concept preview — alpha.18

Added an assembled concept view with independent placement and rotation for each piece copy, yarn-band colors, camera rotation, optional labels and PNG download. Layouts persist in projects and named revisions without changing yarn calculations.

## Seam plans and controlled folds — alpha.19

Added named seams between piece-copy edges with orientation and joining notes; project assembly notes; length/unavailable-edge warnings and review after geometry changes. Added one controlled fold per copy with axis, position, side and angle. Assembly PNG guides follow folds. Notes exports include seam/fold descriptions. Revision recovery, project persistence and unsaved-draft protection cover the new data.

## Expanded workflows — alpha.20

Added seam-alignment previews, multiple parallel folds, bag-panel template, project photos, combined piece exports, crochet terminology/starter definitions, shaping proposal settings, focused chart navigation, pattern metadata/source imports, flat/circular knitting and a bundled offline yarn catalog. Fixed browser-test inventory selectors to distinguish the parent inventory section from its nested catalog. No automatic full-pattern, physical drape or release-acceptance claim is made.
