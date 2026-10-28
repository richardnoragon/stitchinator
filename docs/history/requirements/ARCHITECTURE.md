# Architecture

Planning draft; no implementation is asserted.

## Confirmed direction

A browser interface backed by Rust, running locally through Docker on Windows, Linux, and macOS. Every version uses Docker distribution. Application operation is offline only. Crochet is the initial focus; knitting comes later.

## Open decisions

- Shared design representation linking symbol charts, textured 2D shape previews, 3D previews, calculations, and optional written instructions. All three visualization modes are required; 3D shows overall shape, colors, and approximate stitch texture.
- Frontend technology and rendering.
- Container layout, CPU architectures, and Docker prerequisites.
- Storage, portable project files, backup, and restore.
- Local access boundaries and authentication.
- Download and update workflow: internet is allowed for installation and updates; all runtime assets must be available offline.
- Module boundaries and future knitting support.

Tauri, cloud sync, mobile companions, and specific library arrangements in napkin.md are proposals, not accepted decisions.

## Confirmed workflow constraints

Support free drawing, dimensioned templates, and manual stitch placement in combination. The interface uses US English; crochet terminology is a per-project setting. Personal yarn inventory is entered manually in the first release. Yarn estimates and stitch/row calculations use project inputs including yarn, stitch type, and gauge; additional estimation details remain open. A built-in yarn catalog is deferred.

## Calculation and visualization requirements

Users enter finished dimensions. Support flat rows, joined rounds, spiral rounds, and assembled pieces. A measured swatch supplies dimensions, stitch/row counts, and weight; yarn information supplies length and weight per skein. Yarn estimates include a configurable allowance and report grams/meters and skeins needed. Formula details, rounding, and mixed-stitch or mixed-yarn estimation methods remain open; these designs are required.

Initial 3D fidelity is a rotatable representation of overall shape, colors, and approximate stitch texture. Individual-stitch geometry and realistic drape are not initial requirements. Changes should appear in a preview; Apply is required before committing changes to the design.

Export contents are user-selectable, including instructions alone or a picture with yarn requirements. Initial formats are PDF and PNG.

## Confirmed everyday-use requirements

- US English interface and instruction prose; per-project US, UK, or German stitch names and abbreviations.
- Dimension and stitch changes update previews immediately; Apply commits proposed changes to the design. Autosave must preserve this distinction.
- Initial exports: PDF for printable documents and PNG for pictures, with user-selected contents.
- Multiple colors, yarn types, and stitch patterns within a piece, with quantity estimates separately for each yarn.
- Autosave, recovery after an unexpected shutdown, and portable project files for backup or transfer.
- Single user, no login, accessible only on the computer running Docker.
- Metric measurements only initially.
- Earlier design revisions must be recoverable using descriptive, searchable names.

## Project history, inventory, and progress

- Recover earlier design revisions using descriptive, searchable names rather than dates alone. Revisions are saved explicitly with a descriptive name; search matching remains open.
- Portable project files include charts, notes, photos, yarn details, swatch measurements, and instructions needed to reopen the project on another computer.
- Track yarn owned, reserved for projects, and actually consumed; warn when a design exceeds available inventory. Reserve at Ready to make; record actual consumption manually in grams. Allow visible shortages; editable consumption entries adjust stock/reservations with an audit record.
- Yarn fields include brand, product name, fiber composition, color, dye lot, yarn weight/category, meters and grams per skein, remaining quantity, and optional cost. Also record flat yarn with width or round yarn with diameter; width, diameter, and optional flat-yarn thickness use millimeters.
- Support multiple measured swatches per project, associated with the corresponding yarn/stitch combination for estimates.
- Initial testing templates: rectangle, circle, oval, triangle, and bag base with sides. These are confirmed for initial testing; final release template coverage remains open.
- Manually mark completed rows/rounds and remember the stopping point separately for each piece of an assembled project.

## Revision and inventory behavior

- Autosave runs separately from an explicit Save revision action that asks for a descriptive, searchable name.
- Restoring a revision creates a new current design and preserves all existing revisions. Crochet progress and actual yarn consumption remain unchanged initially.
- After restoration, explain that recorded consumption reflects prior work and offer a deliberate review/update action for the changed design. Never automatically replace measured consumption with a new estimate. The exact correction workflow remains open.
- Reserve yarn when the project is marked Ready to make. Warn when other projects already reserve the same stock; allow proceeding with a clearly displayed shortage to purchase.
- Manually record actual grams used. Deduct that amount from stock and reduce the project's reservation. Handling excess consumption, corrections, and leftover reservations remains to be defined.
- Measure flat-yarn width and round-yarn diameter in millimeters; flat yarn also has optional thickness in millimeters.
- When edits affect pieces with recorded progress, warn and let the user retain or reset progress for those pieces.
- Allow design work without all swatches, but mark the affected yarn estimate unavailable until the corresponding measurements are entered. Do not substitute a rough estimate. A project total with missing estimates must not appear complete.

## Project lifecycle and inventory accounting

- Project statuses: Draft, Ready to make, In progress, Completed, On hold, and Abandoned. Detailed permitted transitions remain open.
- Ready to make triggers reservation. Insufficient available yarn does not block proceeding; clearly display the shortage to purchase. Warn about competing reservations. Never represent missing yarn as physically owned stock; exact reservation accounting remains to be specified.
- Applied design changes that alter yarn needs show the difference and ask for approval before updating reservations.
- Completing or abandoning a project releases remaining reservations and preserves recorded actual consumption. On-hold projects keep their reservations.
- Consumption entries can be edited or removed. Correct stock and reservations automatically and retain an audit record of the correction. The rules must account for project status and avoid resurrecting released reservations.

## Collection backups

Back up the entire collection, including projects, revision history, and yarn inventory. Create a full backup on the first day of each calendar month and incremental backups daily. Retain three monthly cycles and their daily incrementals in a user-selected folder outside the container. Run overdue backups at startup. Warn persistently and retry if the destination is unavailable, without blocking normal work. Restore by date/time after making a safety backup of the current collection. Backups run at the first opportunity each local calendar day while the app is running. A monthly full replaces that day’s incremental. Restoration stops if the required safety backup fails. Incremental backups must retain the full backup and other dependencies needed for restoration; retention must not break a retained backup chain.

## Reservation review and restore behavior

Declining a proposed reservation update keeps the applied design change and marks the project Reservation needs review until reconciled.

Backups use calendar months, not rolling 30-day intervals. Retain three full monthly cycles with their daily incrementals. Overdue backups at startup capture the current state only. Restore points are selected by date/time; create a safety backup before replacing the current collection. Use the computer’s local timezone and the first daily opportunity while running. Create an initial full backup when the destination is configured. A monthly full replaces that day’s incremental. Stop restoration if the safety backup fails.

## Crochet editing requirements

- Initial stitch library includes common stitches, increases, decreases, clusters, shells, and chains/spaces. Support custom stitches and reusable stitch combinations; their definition and validation rules remain open.
- Charts support rectangular rows and circular/radial layouts for rounds, with manual symbol repositioning.
- A settings dialog lets the user enable or disable proposed increase/decrease placement. Manual placement remains available. Suggestions default to enabled per project and require Apply.
- Generated bullet instructions describe each row or round, including stitch totals and repeat counts. Users can edit generated text; preserve edits, flag affected instructions, and show regenerated text alongside for comparison.
- Existing-pattern import requirements and formats are deferred for later discussion.

## Editor interaction rules

- Shaping suggestions are enabled by default and configurable per project. Proposed increases/decreases appear in preview and require Apply; manual placement remains available.
- Preserve manually edited instructions when the design changes. Flag affected instructions for review and show regenerated text alongside the existing text for comparison. Exact reconciliation controls remain open.
- Custom stitches define name, abbreviation, symbol, stitches consumed, and stitches produced. Their yarn estimates require corresponding measured swatches. Further semantics needed for rendering or complex connectivity remain open.
- Users can select a group of stitches, name it, and reuse the combination across projects, including repeats and borders.
- Flag mismatched stitch counts and incomplete rounds without blocking editing. Warn before instruction export when issues remain unresolved.
- Initial hardware: Framework laptop with Intel Core i5-1240P and 32 GB RAM, running Kubuntu 26.04 and Firefox. Graphics configuration and exact browser/Docker versions have not been confirmed; no performance threshold has been established.

## Library organization

Projects and reusable stitch combinations support names, descriptions, tags, search, and folders in the initial release. Existing projects retain their original copies of reusable stitches/combinations when library definitions change; offer an explicit update instead of silently changing existing designs. Update preview and reconciliation details remain to be specified.

## Prototype example and library organization details

- The prototype acceptance example is a rectangular scarf using one yarn and one stitch pattern. Finished dimensions and measured swatch data will be supplied later; no numeric fixture has been selected.
- Updating a project's library stitch definitions uses preview and Apply. Flag affected instructions and yarn reservations for review; preserve the existing rules for edited text and reservation approval.
- Folders support nesting. Each project or reusable stitch combination belongs to one folder; tags provide additional organization.

## Multi-piece design and working view

Confirmed on 2026-10-27:

- A project can contain multiple pieces, each with a required quantity, such as two handles. Include quantities in yarn estimates; each copy tracks progress separately while sharing the design.
- Users can add finishing and assembly steps, including joining pieces, attaching handles, and weaving in ends, alongside generated row/round instructions.
- Swatches record hook size and whether measurements are before or after blocking. Use post-blocking gauge by default when both measurements exist; retain pre-blocking measurements for reference.
- Track dye lots of the same yarn separately and warn when a project needs to mix lots.
- Provide a focused working view with enlarged chart, current row/round highlight, and forward/back buttons.
- Custom stitches and stitch patterns must be available initially. The proposed restriction of the initial scarf prototype to one built-in single-crochet stitch was rejected. The scarf remains the baseline example; custom definitions and patterns are part of initial prototype scope rather than deferred to subsequent milestones.
- When importing a project already in the collection, offer Open existing or Import as a separate copy; never overwrite automatically. Duplicate identification remains open; imported yarn stays reference-only until explicitly linked to stock.

## Progress, swatch selection, and pattern editing

Confirmed on 2026-10-27:

- Repeated copies of a piece share a design but track progress separately, for example two handles.
- Next row/round marks the current row/round complete. Backward navigation does not erase completion; undoing completion is a separate action.
- When both measurements exist, finished-size calculations default to post-blocking gauge. Retain pre-blocking measurements for reference. Allow pre-blocking-only calculations with a visible Before blocking label.
- Each yarn/stitch swatch combination includes hook size; a project can use multiple hook sizes.
- Prefer allocation from one dye lot when enough stock is available. If mixing lots is necessary, ask the user to choose the lots.
- Imported yarn details remain project reference information until explicitly linked to local stock. Importing a project must not add physically owned yarn automatically.
- Initial stitch-pattern editing is visual: arrange stitches, mark repeating sections, and save patterns for reuse.

## Calculation inputs and custom symbols

Confirmed on 2026-10-27:

- If only pre-blocking swatch measurements exist, allow calculations using them with a visible Before blocking label. Prefer post-blocking gauge when both exist.
- Swatch weight is the weight of the measured crochet fabric alone, excluding leftover yarn. Explain this beside the input field.
- Default extra yarn allowance is 10%, configurable per project. This is a starting setting for testing, not a validated guarantee of sufficient yarn.
- Record remaining yarn in grams, including partial skeins. Calculate meters and skein equivalents from the recorded yarn length/weight specifications. Numeric precision and rounding rules remain to be defined.
- Provide all three custom-symbol methods initially: a simple drawing editor, selection from existing symbols, and SVG/PNG import. Import validation and symbol-to-stitch mapping remain to be designed.
- Real prototype acceptance measurements are explicitly deferred. No user swatch or scarf measurements have been supplied, and no acceptance results are claimed. Synthetic fixtures, if used during development, must be clearly labeled and cannot establish real-world estimation accuracy.

## Accessibility, export preferences, and backup visibility

Confirmed on 2026-10-27:

- Initial accessibility requirements include keyboard navigation, adjustable interface text size, and chart zoom.
- Each project remembers selected export contents and offers an export preview before saving.
- The home screen shows the last successful backup, overdue or failed backup status, and a Back up now action. Manual-backup type and its interaction with scheduled backups remain implementation details to specify.

## Initial implementation — 2026-10-27

The first increment uses Rust with Axum/Tokio and Serde, serving locally embedded HTML/CSS/JavaScript. Canvas projects a simple rectangular mesh for approximate 3D visualization. The current workspace is stored as JSON via serialized temporary-write/rename operations, with a 2 MB request limit. This is a single-workspace prototype, not the final project database or backup design. Docker runs as a non-root user with a persistent volume and host-loopback port publication. Host/Origin checks and same-origin asset restrictions are included. Power-loss recovery guarantees and full schema migrations remain unimplemented.

## Project library implementation — alpha.6

Projects are stored as separate JSON files under `/data/projects`, keyed by validated IDs. Migration copies the old `project.json` to `projects/legacy.json` once and preserves the original. Saves use per-project optimistic versions and a shared write lock; the browser waits for a successful save before switching and captures the destination ID for queued saves. Names, descriptions, tags, and normalized folder paths provide library organization. Folders are logical paths on projects, not arbitrary filesystem locations. The single-project write endpoint rejects old clients with a refresh/download message.

## Backup implementation — alpha.7

Backup envelopes contain checksummed JSON snapshots or changed-project deltas with parent IDs and deletions, grouped by local calendar month. A shared collection lock serializes backup/restore with project writes. A minute-based scheduler creates an initial full, new-month full, or daily incremental and retries failures. Retention removes complete old monthly directories after a successful regular backup. Restore validates chains, writes a full safety snapshot, stages projects with advanced versions, and switches directories; startup resolves interrupted switches. The marker-gated backup root is outside app data. A migration marker prevents an intentionally restored empty library from reimporting the old single-workspace file. Linux Compose mounts the host timezone and grants the non-root process access via a configured supplementary group.

## Multi-piece model — alpha.8

Schema 2 stores shared project fields, symbols and patterns alongside a pieces array and activePieceId. Each piece has its own chart, measurements, instructions and quantity. The model module validates legacy and current files, normalizes legacy revision snapshots, and exposes editor views to existing controllers. New files and saves use schema 2; the server rejects a schema-1 write over a schema-2 project. Backups preserve either schema. Aggregate estimates use Rust's existing measured-area calculation independently for each piece and multiply consumption by quantity; no inventory grouping is implied.

## Progress implementation — alpha.9

Optional root-level progress records are keyed by stable piece ID and copy ordinal. They are operational state excluded from design snapshots. Undo/redo preserves the current progress map. Each record stores a completed-row count, note, and design basis used to detect changes requiring review. Removed copies retain records, permitting recovery without identity reassignment. Project validation checks bounded counts, notes and identities. Backups include progress with the entire project.

## Inventory implementation — alpha.10

The shared inventory envelope is stored as reserved `projects/_inventory.json`, hidden from the project library and served through `/api/inventory`. The reserved filename is inaccessible through project-ID routes. It participates in the same collection lock, staged restoration, version advancement, checksum validation, and incremental backup chain as projects. A missing file represents empty inventory. Typed yarn validation bounds fields, quantities and dimensions and rejects duplicate lot IDs. Writes use temporary-file rename and optimistic inventory versions. Inventory is operational collection state, outside project design revisions.

## Yarn planning — alpha.11

Each piece may hold a copied `yarn` inventory record, while root-level `lifecycle` and `reservation.grams` remain operational project state. Normal PUT operations preserve those fields from storage, ignoring incoming copies; only the reservation endpoint changes them. A review computes Rust area estimates per piece/quantity and groups grams by lot. A SHA-256 token covers all stored projects and inventory; apply verifies it under the shared collection lock before a single-project atomic write and version increment. Reservations store demand, including shortages, separately from physical owned stock. Availability subtracts other active project demands with a zero floor. There is no priority allocation or consumption transaction yet. Existing collection backups include all operational fields.

## Consumption accounting — alpha.12

The inventory envelope contains consumption records keyed by project ID and lot ID with immutable correction history. Posting new or corrected totals checks project and inventory versions under the shared collection lock, validates nonnegative physical stock, writes a temporary inventory snapshot, syncs it, and atomically renames it. Only this single file changes. Approved project requirements remain gross amounts; reservation reports subtract current ledger totals, floor at zero, and honor inactive project status. Normal inventory writes preserve the stored ledger and cannot remove referenced lots. Design revisions never include ledger records. Existing full/incremental/safety backups contain the complete accounting snapshot. A failed or ambiguous request must be refreshed before retrying.

## Yarn bands — alpha.13

Optional piece.sections contains ordered rectangular bands with length percentages, color, swatch fields, pattern descriptions, and lot allocations carrying copied inventory records. Saved band definitions may have incomplete gauge or overall coverage; calculations require positive measurements and 100% coverage and allocation sums. Split lots require matching material/color/skein metadata. The Rust piece-estimate function is shared by multi-band estimates and reservation requirements. Export calculations request one copy then apply export quantity once; project estimates request full quantity. Effective reservations continue to subtract recorded consumption per lot. Legacy projects without sections retain their original calculation path. Schema 2 revisions already snapshot the entire piece model.

## Flat geometry — alpha.14

Optional piece.shape defaults to rectangle. Circle uses width for both axes; ellipse uses width/length; triangle has a centered apex at normalized height zero. Rust integrates normalized width over each band's height interval: rectangle F(y)=y, triangle F(y)=y²/2, ellipse/circle use the analytic circular-segment integral. Band swatch calculations scale by that area fraction, then quantity and lot shares. JavaScript uses matching geometry for review detection and previews. Nonrectangular piece estimates omit construction counts; sample charts remain independent. Shape selection is transient until Apply, and snapshots retain only committed shape.

## Radial sample model — alpha.15

Optional piece.roundChart contains mode, reading direction, and ordered rounds with variable-length stitch-ID arrays, optional angular/radial offsets, and saved instruction text/source signatures. Joined mode uses fixed radii per round; spiral mode advances radius along each round. Geometry is illustrative and independent of gauge. Count warnings compare consumption with prior output. Source signatures include round index, mode/direction, and relevant stitch definitions, excluding layout-only offsets. SVG provides interactive/keyboard painting; canvas generates portable raster output. Draft text is retained outside render state until committed; ordinary piece snapshots preserve saved chart data. Inventory and reservation calculations are unaffected.

## Explicit round construction — alpha.16

Optional roundChart.foundation = {kind: magic|chain, chains: 1..20}; optional round.construction = {join: unspecified|none|first-stitch|first-chain, chains: 0..6, counts: boolean, turn: boolean}. Counted chains require a positive chain count and add one produced stitch independently of cells. Joins add none. Instruction source fingerprints include explicit construction; absent legacy fields remain valid. UI selectors apply through existing undo/change/pending-edit guards. Construction conflicts are warnings rather than silent model rewrites.

## Stitch placement guidance — alpha.17

Optional round.placement = sequential enables working-order base ranges. Absent fields preserve legacy behavior. roundPlacement derives ranges from consumed counts and previous-round produced counts, including counted starting chains. The instruction fingerprint includes previous-round symbol outputs and construction for sequential rounds. Placement persists through the existing piece/revision/export/backup model; no schema migration or server change is required.

## Assembly concept preview — alpha.18

Optional piece.assembly maps copy numbers 1..99 to {x,y,z,rx,ry,rz}. Translations are centimeters in [-1000,1000]; rotations are degrees in [-180,180]. Missing poses use an automatic grid. Hidden copy poses are retained across quantity reductions. Existing piece snapshots and backup persistence include the map. The canvas renderer builds shape strips with yarn-band boundaries, applies X/Y/Z rotations and translation, then an orthographic camera and automatic fit. Depth sorting is approximate, not a solid/intersection solver. Camera and labels are ephemeral UI choices.

## Seam plans and controlled folds — alpha.19

Optional project.assemblyPlan = {notes, seams}; each seam has id, name, note, a/b endpoints {pieceId, copy, edge}, reverse and basis. The plan is a design revision key. Endpoint shape/dimensions/fold settings form its review basis. Translation/rotation moves guides without invalidating construction review. Stale references survive quantity/shape changes and are reported rather than silently removed. Export views carry a derived assemblyReport for notes and warning rendering.

Optional pose.fold = {axis: x|y, position: 1..99, side: positive|negative, angle: -180..180}. Original flat polygons are clipped at the hinge, then one half is rotated by foldPoint before rigid pose and camera transforms. Edge guide samples use the same fold transform. Arc lengths use 32 chords per quarter. The model preserves material dimensions; it does not solve constraints or simulate fabric.

assembly-plan.mjs also manages explicit-save seam and note drafts. Its hasDraft participates in pending-design checks, project navigation, undo/redo and backup/export guards. Both new structures are included in portable projects and full/incremental collection backups through existing JSON persistence.

## Expanded workflows — alpha.20

Adds optional root craft, terminology, photos and shapingSuggestions design keys and per-piece knittingMode. Old projects default to crochet, US labels and enabled shaping suggestions. pose.folds is an ordered array of up to eight parallel creases; legacy pose.fold is read until the next fold edit. Crease geometry is split in flat coordinates and transformed around prior transformed parallel hinges. Alignment composes a shortest-arc world rotation and translation, converts to the existing Euler pose and reports sampled RMS edge residual.

Project photos are normalized JPEG data URLs and counted in the 2 MB project limit. Patterns optionally carry id, description, tags, folder and librarySource mapping. Source snapshots use existing project APIs; there is no second unbacked library store. Template/library previews check a complete project basis before replacing the design. Knitting row instruction fingerprints include craft/mode. Catalog entries are bundled static factual references; copying into inventory uses existing explicit-save/version checks. Combined documents render each piece independently and include project notes/photos once.
