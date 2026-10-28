# Roadmap

Planning draft. No delivery dates or implementation milestones are committed.

## Current implementation and remaining gates — alpha.20

The historical planning entries below are retained as requirements history. Current implemented workflows include crochet and knitting sample charts, custom symbols, reusable patterns with metadata/search/folders and explicit source updates, project photos, measured-swatch estimates, multi-piece quantities/progress, shared stock/reservations/usage, yarn bands/split lots, backups/revisions, selectable PDF/PNG exports (including all-piece documents), terminology, shape templates, radial construction/count guidance, bag-panel assembly, seam notes/alignment, and multiple parallel folds. A curated three-product offline yarn catalog and initial knitting support were explicitly authorized and implemented in this increment.

Remaining acceptance/decision gates: real swatch and finished-piece measurements, owner/girlfriend workflow acceptance, exact-size rounding/repeat policy, deletion/Trash policy, workflow approval and licensing. Windows/macOS still require host verification. A complete first release is not declared on synthetic tests alone.

Known implementation boundaries: charts remain sample-based; automatic full-piece shaping/pattern validation, arbitrary shared-base stitch attachments, stitch-level multi-yarn colorwork/yarns held together, crossing fold lines, physical cloth/seam constraints and drape are not implemented. These require further modeling and validation; they are not silently treated as complete. Physical drape and individual-stitch rendering were explicitly outside the agreed initial preview fidelity.

## Current: establish requirements

Refine calculations, visualization fidelity, crochet construction methods, storage, exports, and acceptance criteria. Populate remaining documents through successive discussion rounds. Return to the concrete scarf or bag example later, as requested by the owner.

## First release

Private, local Docker application for Windows, Linux, and macOS, using a browser interface and Rust backend. Runtime is offline; downloads and updates may use internet access.

- Core crochet chart editor, undo/redo, save/load, and pattern library.
- Offline operation, local storage, and portable project bundles; cloud sync is excluded by the offline-only requirement.
- Project management covering charts, notes, photos, yarn inventory, progress, and measurements.
- Manually entered personal yarn inventory; yarn quantity estimation is essential. Inventory metadata and shortage reporting are confirmed below; cost-calculation behavior remains open.
- Pattern calculations using yarn, stitch type, and measured gauge to calculate stitch and row counts. Users enter target dimensions. Calculations use a measured swatch, including its dimensions, stitch/row counts, and weight, plus yarn length and weight per skein. Estimates include a configurable extra allowance and report grams/meters and skeins. Shaping rules remain open.
- Optional generation of bullet-style crochet instructions.
- Modern exports: the export-system section is accepted; users select the contents, such as instructions only or a picture with yarn requirements. Initial formats are PDF and PNG.
- All three visualization modes: a 2D crochet symbol chart, a 2D shape preview with yarn colors and stitch texture, and a rotatable 3D preview showing overall shape, colors, and approximate stitch texture. Realistic drape simulation and individual-stitch rendering are outside the initial fidelity requirement.
- Combined design approaches: free drawing, templates with dimensions, and manual stitch placement.
- US English interface with crochet terminology selected per project. Initial choices are US, UK, and German; instruction prose stays in US English.

## Later

- Knitting support.
- Built-in yarn catalog.

Mobile companions and cloud sync are not committed release features; searchable named design revisions are required.

## Further confirmed requirements

- Support flat rows, joined rounds, continuous spiral rounds, and separate pieces joined together.
- Dimension or stitch changes should update a preview. Apply is required before committing changes to the design.
- US English remains the language direction; prose stays in US English, with per-project US, UK, or German stitch names and abbreviations.

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

- Recover earlier design revisions using descriptive, searchable names rather than dates alone. Name entry, search matching, and snapshot timing remain to be defined.
- Portable project files include charts, notes, photos, yarn details, swatch measurements, and instructions needed to reopen the project on another computer.
- Track yarn owned, reserved for projects, and actually consumed; warn when a design exceeds available inventory. Reservation and consumption rules remain open.
- Yarn fields include brand, product name, fiber composition, color, dye lot, yarn weight/category, meters and grams per skein, remaining quantity, and optional cost. Also record flat yarn with width or round yarn with diameter; metric field units remain to be selected.
- Support multiple measured swatches per project, associated with the corresponding yarn/stitch combination for estimates.
- Initial testing templates: rectangle, circle, oval, triangle, and bag base with sides. These are confirmed for initial testing; final release template coverage remains open.
- Manually mark completed rows/rounds and remember the stopping point separately for each piece of an assembled project.

## Initial validation platform

Initial testing is on Kubuntu Linux only. Windows and macOS remain intended host platforms; they are not yet verified. Initial environment: Kubuntu 26.04 (interpreting the owner’s “2604”), Firefox, and 32 GB RAM. CPU architecture, GPU, Docker version, and Firefox version remain open. The owner performs technical checks and approves releases after his girlfriend validates crochet workflows. The existing Standard Versioning Policy applies.

## Crochet editing requirements

- Initial stitch library includes common stitches, increases, decreases, clusters, shells, and chains/spaces. Support custom stitches and reusable stitch combinations; their definition and validation rules remain open.
- Charts support rectangular rows and circular/radial layouts for rounds, with manual symbol repositioning.
- A settings dialog lets the user enable or disable proposed increase/decrease placement. Manual placement remains available. Suggestions default to enabled per project and require preview and Apply.
- Generated bullet instructions describe each row or round, including stitch totals and repeat counts. Users can edit generated text; preserve edited text, flag affected instructions, and display regenerated text alongside for review.
- Existing-pattern import requirements and formats are deferred for later discussion.

## Approved internal prototype

Build an early internal prototype covering one rectangular crochet piece, chart editing, measured-swatch yarn estimation, and a basic 3D preview. This is an intermediate validation milestone, not a reduction of the agreed first-release scope. Detailed prototype acceptance examples and limits remain to be defined. Initial testing is on the owner's Kubuntu Framework laptop.

Projects and reusable stitch combinations require names, descriptions, tags, search, and folders for the first release. Existing projects keep their original library definitions unless explicitly updated.

## Prototype example and library organization details

- The prototype acceptance example is a rectangular scarf using one yarn and one stitch pattern. Finished dimensions and measured swatch data will be supplied later; no numeric fixture has been selected.
- Updating a project's library stitch definitions uses preview and Apply. Flag affected instructions and yarn reservations for review; preserve the existing rules for edited text and reservation approval.
- Folders support nesting. Each project or reusable stitch combination belongs to one folder; tags provide additional organization.

## Deferred decisions

Development workflow approval, handling dimensions incompatible with gauge/repeats, and Trash/folder deletion behavior are explicitly deferred. No proposed defaults for these questions have been accepted.

## Multi-piece design and working view

Confirmed on 2026-10-27:

- A project can contain multiple pieces, each with a required quantity, such as two handles. Include quantities in yarn estimates; each copy has separate progress while sharing its design.
- Users can add finishing and assembly steps, including joining pieces, attaching handles, and weaving in ends, alongside generated row/round instructions.
- Swatches record hook size and whether measurements are before or after blocking. Post-blocking gauge is the default when both exist.
- Track dye lots of the same yarn separately and warn when a project needs to mix lots.
- Provide a focused working view with enlarged chart, current row/round highlight, and forward/back buttons.
- Custom stitches and stitch patterns must be available initially. The proposed restriction of the initial scarf prototype to one built-in single-crochet stitch was rejected. The scarf remains the baseline example; custom definitions and patterns are part of initial prototype scope rather than deferred to subsequent milestones.
- When importing a project already in the collection, offer Open existing or Import as a separate copy; never overwrite automatically. Duplicate identification remains open; imported yarn stays reference-only until explicitly linked to stock.

## Additional initial capabilities and deferred validation

Custom symbols support a drawing editor, existing-symbol selection, and SVG/PNG import. Default yarn allowance is 10%, configurable per project. Real swatch and scarf acceptance measurements are deferred by the owner; no real-data validation has occurred.

## Implementation started — 2026-10-27

The first internal increment now implements the Rust server, rectangular sample-chart editing, custom text-symbol stitches, named repeating tiles, swatch-based estimation, local persistence, approximate 2D/3D previews, and Docker packaging. See the root README for run instructions and explicit limitations. The complete prototype and first-release requirements are not yet fulfilled. Development-workflow approval remains deferred; the owner has explicitly authorized coding.

## Implementation status — alpha.8

The model refactor and multiple rectangular pieces are implemented, including quantities, per-piece swatches/instructions, aggregate mass estimates, and schema migration. Next: per-piece progress and stopping points, followed by personal yarn inventory, project reservations, and shortage reporting. Shape/round construction and assembled previews remain required future work. Real crochet acceptance measurements and explicitly deferred decisions remain open.

## Implementation status — alpha.9

Per-copy manual row counts, stopping notes, and design-change review are implemented. Next: manually entered personal yarn inventory and dye lots, then allocation to pieces, Ready-to-make reservations, shortages, and consumption accounting. Round construction and assembled previews remain future work.

## Implementation status — alpha.10

Shared personal yarn inventory and dye-lot records are implemented with manual remaining quantities and collection backup coverage. Next: assign inventory yarn to pieces with explicit application of yarn specifications, then Ready-to-make reservations and competing-stock/shortage reporting, followed by actual consumption and corrections.

## Implementation status — alpha.11

Explicit one-lot-per-piece assignments, project lifecycle, reviewed reservations, competing-demand warnings, and shortage reporting are implemented. Next: actual consumption entries with atomic stock/reservation updates and correction history, then multiple yarns and explicit split-lot allocation within a piece. Round construction and assembled previews remain future work.

## Implementation status — alpha.12

Actual project/lot consumption, corrected totals, removal with history, and effective reservation accounting are implemented. Next: multiple yarns within a piece and explicit split-lot allocation, followed by round/shape construction and assembled previews. Real crochet acceptance measurements remain deferred.

## Implementation status — alpha.13

Rectangular yarn bands, independent swatches, explicit split-lot shares, colored previews, and per-lot exports/reservations are implemented. Next: shape and round construction with appropriate charts and gauge rules, followed by assembled multi-piece previews. Stitch-level colorwork, yarns held together, and automatic gauge transitions need separate models and remain planned.

## Implementation status — alpha.14

Flat circle, ellipse, and triangle previews and area-based yarn estimates are implemented, including band intersections and persistence. Next: radial chart editing and explicit joined/spiral-round construction rules, then assembled multi-piece previews. Shaping suggestions and valid construction instructions remain required future work; shape geometry alone does not fulfill them.

## Implementation status — alpha.15

Radial sample editing, joined/spiral layouts, round summaries, count warnings, manual symbol positioning, and export/recovery are implemented. Next: explicit starting-ring/join/turning-chain rules and shaping guidance, then assembled multi-piece previews. A radial layout alone does not establish a valid full-piece crochet pattern.

## Explicit round construction — alpha.16

Starting-ring, join, starting-chain counting and turning choices are implemented, with instruction review and conflict warnings. Next: explicit stitch placement and shaping guidance, then assembled multi-piece previews. Construction choices are user supplied; automatic full-piece pattern validation and real crochet acceptance remain open.

## Stitch placement guidance — alpha.17

Sequential base placement, per-symbol shaping counts and base availability warnings are implemented. Next: assembled multi-piece previews. Arbitrary shared-base/chain-space placement, automatic shaping to dimensions and validated full-piece patterns remain open; the current guidance is count-based and requires manual crochet review.

## Assembly concept preview — alpha.18

Rigid multi-piece assembly layouts, per-copy transforms, yarn-band colors and standalone PNG export are implemented. Next: explicit edge/seam relationships and assembly notes, then controlled folds and more realistic previews. Automatic shaping to dimensions, arbitrary stitch attachment and validated full-piece patterns remain open.

## Seam plans and controlled folds — alpha.19

Explicit edge relationships, assembly notes, approximate edge-length warnings, geometry review flags, one controlled fold per copy, folded seam guides, and notes export are implemented. Next: interactive edge alignment and improved assembly inspection, then multiple-fold support and more realistic fabric previews. Physical seam constraints, drape, collision/thickness, automatic shaping and crochet acceptance remain open.

## Editor review follow-up — 2026-10-28

Prioritize editor improvements from the girlfriend's review before moving to the next acceptance stage. Added an expanded 27-preset crochet library with family filtering, top/center/bottom symbol anchors, midpoint/corner-vertex snapping and independent per-occurrence orientation for rectangular and radial samples. Following clarification, automatic nearest-guide/connection-vertex snapping, drag placement, custom segments/arcs, grid/round/spiral guides, Along/Perpendicular tangent orientation, saved global defaults and one-placement bypasses are implemented. Connections remain visual rather than crochet attachment constraints. Real workflow acceptance and clarification of further complex stitch recipes remain open.

## Shared picture pattern library — 2026-10-28

Confirmed requirements: one shared library across projects, bundled starters and user-created entries; symbol-chart pictures with optional fabric photos; visible stitch lists, description and editable crochet instructions. Users may edit the chart, description and recipe only as independent copies saved under unique new names. Implemented gallery/search, copy editor, photo normalization, capture from current charts/reusable tiles, independent imports into project patterns, append-only server persistence and collection backup/restore. Initial starters and editing are rectangular crochet samples. Craft workflow acceptance remains outstanding.

## Amigurumi — 2026-10-28

The owner requested all proposed import formats (editable project/bundle JSON, typed/pasted rounds, PDF/photo references and automatic conversion of written PDF/photo patterns), all three views (round charts/instructions, approximate assembled stuffed forms and stitch-level geometry), and JSON/PDF/PNG/TXT/OBJ/STL exports. Implemented a dedicated full-round amigurumi model with reviewed imports, offline Poppler/Tesseract extraction including mixed PDF pages, recipe editing, count warnings, quantities/poses, references, gauge-derived surfaces and procedural yarn loops, full-round working view and all requested export formats. Optional model data persists with projects/revisions/backups. Arbitrary stitch topology, asymmetric cloth deformation, automatic interpretation of symbol-only charts and physical stuffing/drape are not solved by these procedural views. Flat-area yarn/reservation estimates are explicitly unavailable for amigurumi until representative consumption is calibrated. Real craft acceptance and distribution/host verification remain open.
