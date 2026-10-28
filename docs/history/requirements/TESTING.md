# Testing

Draft acceptance requirements; no tests have been implemented or run.

## Required validation areas

- Local Docker installation and use on Windows, Linux, and macOS; supported CPU architectures remain open.
- Full runtime operation without internet, including previews, fonts, instructions, and exports.
- Host-only access: the application works locally and is inaccessible from other machines.
- Consistent stitch meaning across US, UK, and German terminology, with US English prose.
- Metric calculations for target dimensions, gauge, stitch/row counts, and separate estimates for each yarn, including allowance and skein rounding. Formula references and tolerances remain open.
- Flat rows, joined rounds, spiral rounds, assembled pieces, and mixed yarn/stitch designs.
- Consistency between charts, textured 2D views, approximate 3D views, and generated instructions. Realistic drape is not an initial acceptance criterion.
- Preview changes do not alter the committed design until Apply; autosave respects that boundary.
- Undo/redo, save/load, autosave, crash recovery, and portable project transfer, including media dependencies.
- Selectable PDF and PNG export contents, including instructions alone and pictures with yarn quantities.
- Invalid or damaged imported files fail without corrupting saved work.

## Pending acceptance decisions

The baseline example is a rectangular scarf; real measurements are deferred. Numerical tolerances, performance targets, and recovery objectives remain open. Release approval follows agreed technical checks and crochet workflow validation without a fixed trial period.

## Additional acceptance requirements

- Save, search for, and restore descriptively named design revisions. Verify handling of duplicate names and effects on progress once rules are selected.
- Reopen portable projects on another computer with included charts, notes, photos, yarn details, swatches, and instructions intact.
- Verify owned, reserved, and consumed yarn accounting and shortage warnings against agreed rules.
- Preserve yarn metadata, including flat yarn width and round yarn diameter.
- Select correct swatch measurements for each yarn/stitch combination in estimates.
- Exercise rectangle, circle, oval, triangle, and bag-base-with-sides templates during initial testing.
- Persist manual row/round completion and stopping points independently for each piece.

## Revision and stock behavior checks

- Autosave and explicit named revision creation remain distinct.
- Restoring creates a new current design, preserves history, and initially preserves progress and actual consumption; the user is informed of consumption's prior-work basis and offered review/update.
- Ready to make reserves yarn and warns of other project reservations.
- Recording grams consumed adjusts stock and reservation consistently, without double deductions after retries or recovery.
- Changes affecting completed work offer retain/reset choices for affected pieces.
- Missing yarn/stitch swatches leave affected estimates unavailable while editing remains possible; partial totals are not presented as complete estimates.
- Flat-yarn width/thickness and round-yarn diameter retain millimeter units through save/load and export where included.

## Lifecycle and backup acceptance requirements

- Insufficient stock permits proceeding while clearly displaying shortages and competing reservations.
- Applied changes show yarn requirement differences and request approval before reservation changes.
- Completion/abandonment releases reservations exactly once, without changing consumption; On hold retains reservations.
- Editing/removing consumption corrects stock and reservations and preserves an audit record, including for completed projects.
- Verify full backup cadence of the first day of each calendar month and daily incremental cadence against the eventual scheduler specification.
- Restore projects, revisions, media, swatches, inventory, progress, and accounting records consistently from full-plus-incremental backups.
- Retention preserves all dependencies of retained restore points. Verify missed-run behavior once selected.

## Backup recovery and review checks

- Full backups fall due on the first of the month across different month lengths; daily incrementals depend on a valid full backup.
- Retain three monthly cycles without deleting dependencies of retained restore points.
- Overdue startup backups capture current state without inventing missed historical snapshots.
- Missing destination produces a persistent warning and retries when available while normal work continues.
- Date/time restore selection resolves the correct chain; a safety backup precedes replacement.
- Declining a reservation update preserves the design change and displays Reservation needs review until reconciled.

## Initial validation platform

Initial testing is on Kubuntu Linux only. Windows and macOS remain intended host platforms; they are not yet verified. Initial environment: Kubuntu 26.04, Firefox, and 32 GB RAM. CPU architecture, GPU, and exact Docker/browser versions remain open. The owner performs technical checks and approves releases after his girlfriend validates crochet workflows. The existing Standard Versioning Policy applies.

## Editor and delivery acceptance checks

- Exercise rectangular and radial charts and manual symbol repositioning.
- Validate built-in stitches, custom stitches, and reusable combinations against agreed definitions.
- Toggle shaping suggestions in settings; manual increase/decrease placement remains available in either state.
- Generated row/round bullets contain correct stitch totals and repeat counts and can be edited. Verify preservation of edited text and side-by-side regenerated text for review.
- Verify local source builds and loading supplied Docker image archives, followed by offline runtime checks.

## Editor interaction validation

- Shaping defaults to enabled, persists per project, and requires Apply without blocking manual placement.
- Design changes preserve edited instruction text, identify affected instructions, and present regenerated comparison text.
- Custom stitch definitions retain names, abbreviations, symbols, and consumed/produced counts; missing swatches produce unavailable estimates.
- Named stitch groups can be reused across projects.
- Invalid counts and incomplete rounds produce warnings without blocking editing; unresolved issues trigger instruction-export warnings.
- Initial hardware is a Framework laptop with i5-1240P and 32 GB RAM. Graphics configuration and performance thresholds remain open; no tests have yet been run.

## Library and prototype validation

- Verify names, descriptions, tags, search, and folders for projects and reusable stitch combinations.
- Editing a library definition leaves existing projects unchanged until explicit update; test update reconciliation once specified.
- The approved internal prototype covers one rectangular piece, chart editing, swatch-based yarn estimation, and basic 3D preview. Define a concrete acceptance fixture before implementation.
- Release approval requires agreed technical checks and crochet workflows, without a fixed trial duration.

## Prototype fixture and library update checks

Use a rectangular scarf with one yarn and one stitch pattern. Dimensions and measured swatch data remain pending; do not invent user measurements or claim acceptance results.

Verify library-definition updates remain proposals until Apply and flag affected instructions/reservations afterward. Verify nested folder organization and that each item has one folder while supporting multiple tags.

## Multi-piece and custom-pattern acceptance checks

- Piece quantities contribute correctly to per-yarn estimates without multiplying actual consumption records.
- User-written finishing/assembly instructions survive regeneration of row/round instructions.
- Preserve hook size, blocking state, and dye-lot identity through save/load and portable transfers; warn when allocating multiple dye lots.
- Focused work view enlarges charts, highlights the current row/round, and supports forward/back navigation; Next marks the current row/round complete; backward navigation preserves completion.
- Initial prototype testing includes custom stitches and stitch patterns, not only a built-in single-crochet stitch. The rectangular scarf remains the baseline fixture.
- Duplicate imports offer Open existing or Import as a separate copy and do not overwrite existing projects automatically.

## Detailed progress and allocation checks

- Repeated piece copies share a design but retain independent completion and stopping points.
- Next row/round marks completion; backward navigation does not change it. Undo completion is explicit.
- Finished-size calculations select post-blocking gauge by default when both states exist and preserve pre-blocking measurements.
- Swatch selection distinguishes hook sizes for the same yarn/stitch pairing.
- Prefer a sufficient single dye lot, respecting existing reservations; request lot selection when mixing is necessary.
- Importing a project preserves yarn references without increasing local stock; linking to stock is explicit.
- Visually create, save, reload, and reuse patterns with marked repeating sections.

## Calculation inputs and symbol acceptance checks

- Pre-blocking-only measurements permit calculations with a visible label; post-blocking measurements take precedence when both exist.
- Swatch-weight guidance specifies sampled fabric alone, excluding leftover yarn.
- Verify the default 10% allowance and project-specific overrides without double application.
- Preserve partial-skein stock in grams and derive length and skein equivalents consistently from specifications. Precision rules remain pending.
- Create custom symbols by drawing, selection, and SVG/PNG import; verify save/load and portable inclusion. Validate imported assets according to the eventual import design.
- Real prototype measurements are deferred. Label synthetic fixtures and do not claim real-world estimation accuracy from them.

## Usability acceptance checks

- Navigate controls by keyboard with visible focus; verify adjustable interface text size and chart zoom without hiding essential controls.
- Persist export-content preferences independently per project; compare preview with saved PDF/PNG content.
- Home screen accurately shows last successful backup and overdue/failed status; Back up now initiates a backup and reports its outcome.

## Initial implementation verification — 2026-10-27

Three Rust calculation tests and Clippy pass. Automated Chromium and Firefox checks cover missing-gauge rejection, synthetic estimates, custom stitches, undo/redo, reusable pattern creation, preview-versus-committed chart sizes, and reload persistence. Test data is isolated in temporary storage. A Docker image build succeeds. These checks do not establish real-world crochet accuracy or completion of the full acceptance requirements. See root README for commands.

Docker smoke checks also pass for health, saved-data persistence after container restart, and rejection of unexpected Host or cross-origin requests. Disposable test containers and their volumes were removed. The local Compose prototype is running on host loopback port 8080.

## Second increment verification

Firefox and Chromium checks pass for drawn, SVG, PNG, and copied symbols; unsafe SVG rejection; rectangular repeat selection; count mismatch warnings; and saved image restoration. Existing prototype workflows remain covered. Custom images are optional schema-1 fields, preserving older project compatibility.

## Third increment verification

Four instruction/gauge logic tests pass: alternating reading direction and repeat groups, row-specific change detection, produced-count width estimates, and missing gauge. Firefox and Chromium checks pass for preserving edited instructions after chart edits, keep/replace review actions, finishing-note persistence, out-of-order review of newly added rows, and retention of removed rows. Existing browser workflows, three Rust tests, and Clippy pass. Real crochet accuracy remains unvalidated.

## Fourth increment verification

Five instruction/gauge/export-warning tests and three Rust calculation tests pass. Firefox and Chromium checks cover PNG downloads, warning acknowledgement, print invocation, per-project export preferences after reload, empty-selection rejection, multi-page navigation, and blocking exports of pending dimensions. Chromium generated an A4 PDF, which was inspected visually. Output is image-based; Firefox's native PDF destination has not been automated. Exports are capped at 20 pages and PNG downloads save the displayed page.

## Fifth increment verification

Eight logic tests pass, including independent non-recursive snapshots, restore preserving prior history and non-design state, duplicate-name rejection, and size-limit rejection without mutation. Firefox and Chromium pass revision creation, case-insensitive search, before/after restore snapshots, reload persistence, portable download/import, and invalid nested-history rejection. Three Rust tests and Clippy pass. Revision actions intentionally start a new transient undo/redo session. Limits remain 100 revisions and 2 MB per project.

## Sixth increment verification

Five Rust tests pass, including path-ID rejection and idempotent migration preserving the original project file and revision metadata. Nine JavaScript logic tests pass. Firefox and Chromium cover creation/switching, isolated history/export preferences, nested folder filtering, metadata search, duplicate-copy imports, last-project reload, portable history, blocked stale writes, identity mismatch rejection, and cancellation of switching after a simulated save failure. The retired single-project write endpoint returns a conflict message. Clippy and formatting checks pass.

## Seventh increment verification

Twelve Rust tests pass, covering initial/daily/monthly scheduling across leap-day and missed days, incremental reconstruction, deletion records, three-cycle retention, checksum/missing-chain rejection, safety-backup failure without project replacement, interrupted-restore recovery, and unavailable destination markers. Nine JavaScript logic tests pass. Firefox and Chromium cover manual backups, restore-point selection, collection restoration, safety-point creation, stale-write rejection after restore, and saving while the backup marker is unavailable. The configured destination is outside the data volume; Linux host-local timezone is mounted read-only.

## Eighth increment verification

Twelve Rust tests and thirteen JavaScript logic tests pass, along with Clippy and Rust formatting checks. Logic tests cover schema-1 project/revision migration, field isolation, invalid piece identities/quantities, and restoration of complete multi-piece designs. Chromium and Firefox pass separate-piece measurement and instruction persistence, unsaved-detail switching protection, quantity-adjusted estimates (synthetic 110 g + 44 g = 154 g), incomplete-total handling, named revision restoration, reload persistence, schema-downgrade rejection, and multi-piece collection backup restoration. Existing export and library regressions also pass. A vendored offline Docker build succeeds. Real crochet measurements and assembled 3D previews are not validated by these checks.

## Ninth increment verification

Twelve Rust tests and fourteen JavaScript logic tests pass; Clippy and Rust formatting checks pass. Progress logic checks cover independent copy counts, preservation across revision restoration and reduced quantities, and invalid-record rejection. Browser regression checks exercise copy switching, stopping-note persistence after reload, design-change review, and explicit reset cancellation/confirmation. Collection restore checks verify both copies retain their saved counts. Counts use synthetic fixtures and do not establish real-world crochet accuracy.

## Tenth increment verification

Fourteen Rust tests and fourteen JavaScript logic tests pass, alongside Clippy. New Rust checks reject invalid quantities and duplicate lot IDs and exercise inventory in backup chains, restoration to a pre-inventory point, and safety recovery. Chromium and Firefox pass creation/editing, dye-lot search, flat-yarn dimensions, calculated remaining meters, invalid quantity rejection, stale inventory writes, restored quantities/version advancement, and exclusion of inventory from the project list. Existing design/progress/export regression checks also pass.

## Eleventh increment verification

Sixteen Rust tests and fifteen JavaScript logic tests pass, plus Clippy and formatting checks. New calculation checks cover quantity-adjusted commitments, competing held commitments, shortages without negative stock, missing measurements, and review detection. Firefox and Chromium exercise explicit assignments and cleared swatches, Ready-to-make approval despite shortage, unchanged physical stock, stale approval rejection, On-hold retention, explicit reconciliation, protected operational fields on ordinary saves, and release on completion. Collection restoration verifies statuses and commitments recover with inventory. Synthetic measurements remain development fixtures, not crochet acceptance evidence.

## Twelfth increment verification

Nineteen Rust tests and fifteen JavaScript logic tests pass; Clippy and Rust formatting checks pass. New tests cover consumption deltas, corrected totals, removal history, rejected overuse, unchanged inputs on failure, atomic stock/ledger snapshots, abandoned temporary writes, and effective commitments remaining released after completion. Chromium and Firefox exercise recording/correcting/removing usage, inventory refresh, stale duplicate rejection, overuse refusal, stock and commitment reconciliation, and full collection recovery of accounting history. Normal inventory updates preserve the existing ledger. All measurements are synthetic development fixtures.

## Thirteenth increment verification

Twenty-one Rust tests and sixteen JavaScript logic tests pass, with Clippy and formatting checks. New tests check rectangular band areas, quantity/allowance applied once, split-lot conservation, incomplete coverage, incompatible lots, missing swatches, and section persistence in revisions/exports. Chromium and Firefox cover two independent measured fabrics, a two-lot split, unavailable partial plans, reservation review and dye-lot warnings, colored canvas pixels, exports, band reordering/undo, and collection restoration of the complete band model. Existing stock, consumption, progress and backup regressions pass. Fixtures are synthetic; gauge transitions and real crochet accuracy remain unvalidated.

## Fourteenth increment verification

Twenty-two Rust tests and seventeen JavaScript logic tests pass, alongside Clippy and formatting checks. Geometry tests cover triangle area and unequal band intersections, ellipse scaling, circle diameter semantics with unused length, unknown-shape rejection, and shape persistence in named revisions. Firefox and Chromium cover preview/cancel without persistence, blocking estimates/exports of pending shapes, committed shape estimates, circle field visibility, shaped-export warnings, and collection recovery of the applied shape. Nonrectangular calculations omit construction counts; these checks do not validate real crochet shaping or round instructions.

## Fifteenth increment verification

Twenty-two Rust tests and nineteen JavaScript logic tests pass; Clippy and formatting checks pass. New logic tests cover round count mismatch detection, joined/spiral geometry, source-review invalidation, offset validation, and revision/export preservation. Chromium and Firefox cover radial creation, painting including custom images, variable round sizes, edited note preservation/review, layout/direction changes, manual offsets, PNG and document output, reload, round removal, collection restoration, and preservation of a draft blocked by a pending shape preview. These are sample-chart checks; starting-ring/join/turning-chain correctness and real full-piece construction remain unvalidated.

## Explicit round construction — alpha.16

Added logic coverage for chain-count arithmetic, downstream round totals, foundation instruction text, stale-note preservation, spiral conflicts, missing chain join targets and invalid imported rules. Browser coverage checks construction choices, warnings, saved-note preservation and reload persistence in Chromium and Firefox.

Alpha.16 validation completed: 22 Rust tests, 20 JavaScript logic tests, Chromium and Firefox workflows, cargo fmt and Clippy. Docker image built offline using cached dependencies.

## Stitch placement guidance — alpha.17

Added coverage for increase/decrease base ranges, missing and unworked bases, zero-consumption attachment warnings, previous-round changes invalidating saved instruction sources, and invalid imported placement rules. Browser coverage verifies the table, round selection and save/reload persistence.

Alpha.17 validation completed: 22 Rust tests, 21 JavaScript logic tests, Chromium and Firefox workflows, cargo fmt and Clippy. Docker image built with offline cached dependencies.

## Assembly concept preview — alpha.18

Added transform/rotation arithmetic, per-copy identity, quantity reduction/restoration, named revision recovery, maximum-copy default bounds and invalid pose validation tests. Browser coverage checks placement controls, PNG download and save/reload persistence.

Alpha.18 validation: 22 Rust tests, 22 JavaScript logic tests, Chromium and Firefox workflows, cargo fmt and Clippy passed. Assembly PNG was visually inspected. Corrected the import workflow test to accept the restored-project status instead of depending on a later autosave. Docker assets and backup destination verified after upgrade.

## Seam plans and controlled folds — alpha.19

Logic coverage checks seam validation, unavailable edges, approximate edge lengths, named-revision recovery, export notes, fold-induced review, both hinge axes, fixed-side preservation, crease splitting and length-preserving fold transforms. Browser coverage adds seam creation, fold controls, geometry-review warnings, blocked changes retaining note drafts, save/reload persistence and document export.

Alpha.19 validation completed: 22 Rust tests, 24 JavaScript logic tests, Chromium and Firefox workflows, cargo fmt and Clippy passed. Folded geometry and seam guides were visually inspected. Docker image built using offline cached dependencies.

## Expanded workflows — alpha.20

Added logic coverage for rigid seam alignment, parallel fold material lengths, bag seam matching, independent terminology/custom definitions, knitting circular reading order, catalog zero-stock drafts, shaping arithmetic, and library snapshot update isolation. Browser extensions cover alignment preview/cancel, multiple folds, photo persistence, bag creation, terminology, knitting/working view, catalog drafts, library import and combined exports.

Alpha.20 validation: 22 Rust tests, 28 JavaScript logic tests, cargo fmt and Clippy passed. Chromium/Firefox end-to-end workflows cover the expanded features. The image is packaged as a Linux amd64 Docker archive with a SHA-256 checksum. Real swatch/finished-piece validation is still deferred.

## Editor review follow-up — 2026-10-28

30 JavaScript logic tests and 22 Rust tests pass, along with cargo fmt and Clippy. Added anchor/rotation arithmetic, invalid placement rejection, radial orientation, placement remapping on rectangular resize, explicit picot/turning-chain counts and terminology checks. Chromium and Firefox regression workflows pass, including per-occurrence rectangular/radial orientation, saved placement reload and portable built-in symbol images. Runtime Docker images have not been repackaged for these source changes. The initial fixed-target controls have since been extended with automatic guide/connection-vertex snapping; girlfriend acceptance remains open.

## Clarified snapping behavior — 2026-10-28

33 JavaScript logic tests pass, including segment projections, arc interiors/endpoints, rotated anchors, tangent/normal orientation, tie-breaking for vertices, disabled snapping and one-placement bypasses. The focused Chromium/Firefox check (`npm run test:browser -- --snapping-only`) passes drag-to-vertex snapping, radial tangent orientation and save/reload. Full Chromium/Firefox regressions also pass, including saved custom guides, automatic line alignment, single-placement bypass, disabled defaults and vertex drag placement. Fixed a preview-message layout shift that changed coordinates during dragging. 22 Rust tests, formatting and Clippy pass. The Docker image has not been repackaged.

## Shared picture pattern library — 2026-10-28

35 JavaScript logic tests and 24 Rust tests pass. New coverage verifies starter data, unique-name independent copies, self-contained definitions, project import/photo/recipe isolation, invalid chart rejection, reserved starter names/IDs and shared-library backup restoration/version advancement. Cargo formatting, Clippy and the offline build pass.

The focused check (`npm run test:browser -- --pictures-only`) passes in Chromium and Firefox: chart previews and legends, edited chart/description/recipe copies, optional-photo normalization, immutable originals, duplicate-name rejection, stale-tab draft retention/retry, project imports, cross-project visibility, search and reload. A held-response test verifies an older queued project save cannot announce that newer edits have been saved. The full existing Chromium/Firefox regression suite also passes. Gallery screenshots were visually checked. Photos in automated checks are synthetic fixtures, not evidence of finished-fabric accuracy. The Docker image has not been repackaged.

## Amigurumi workspace — 2026-10-28

38 JavaScript logic tests pass, including nested/count/starred repeats, terminology conversion, consecutive ranges, malformed/unknown round rejection, German part headings, full-round counts, calibrated profiles, closed surface edge incidence, finite procedural loop vertices, OBJ/STL structure, TXT recipe round trips and project/revision persistence. Existing 24 Rust tests, Clippy, cargo fmt and offline builds pass.

The focused check (`npm run test:browser -- --amigurumi-only`) passes in Chromium and Firefox: starter creation, reviewed per-round edits/colors/notes/gauge, surface and stitch-level views, editable bundle imports, multiple parts/quantities, full-round working view, all seven export types, reload persistence and rejection of misleading flat-area yarn estimates. Real local Tesseract/Poppler calls verify photo OCR, selectable-text PDFs, scanned PDFs and mixed selectable/scanned PDFs; mixed-page tests confirm both page types survive extraction. Dense 1000-symbol charts receive a high-resolution canvas. Surface/stitch screenshots and the generated A4 PDF were inspected; exported STL byte counts/normals and PDF structure were checked. Fixtures are synthetic and do not establish craft accuracy or physical cloth behavior.

The full existing Chromium/Firefox regression suite also passes. Source Docker packaging now installs offline OCR dependencies, but the existing running alpha.20 container has not been rebuilt or replaced. Native OCR was verified using installed host tools; updated Docker packaging still requires an image build. Real amigurumi acceptance, measured yarn consumption and Windows/macOS host verification remain outstanding.
