# Stitchinator

Planning draft: requirements below do not describe implemented software.

Stitchinator is a private crochet design application, initially for the owner's girlfriend. It helps visualize concepts and piece shapes, including scarves and bags, with yarn and stitch choices. Yarn quantity estimation addresses a particular difficulty in her current workflow.

## Deployment

Every version will be distributed through Docker for execution on local Windows, Linux, and macOS computers. The application uses a browser interface backed by Rust. Everyday use must be fully offline; internet access is acceptable for downloading Docker, the application, and updates.

## First-release scope

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

Knitting support and a built-in yarn catalog. License terms remain undecided; the project is private.

## Open requirements

The baseline example is a rectangular scarf. Real measurements, exact-size rounding, deletion behavior, licensing, and development workflow approval remain deferred. Frontend/storage choices and detailed numerical algorithms remain open. Installation instructions will follow a working distribution.

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

## Lifecycle and backups

Track Draft, Ready to make, In progress, Completed, On hold, and Abandoned projects. Allow proceeding with a visible yarn shortage; confirm reservation changes after design changes. Completion or abandonment releases reservations; on-hold projects retain them. Consumption corrections update accounting and retain an audit record.

Back up the entire collection with a full backup on the first day of each calendar month and daily incremental backups. Keep three monthly cycles with their daily incrementals outside the container; run overdue backups at the next startup.

## Initial validation platform

Initial testing is on Kubuntu Linux only. Windows and macOS remain intended host platforms; they are not yet verified. Initial environment: Kubuntu 26.04 (interpreting the owner’s “2604”), Firefox, and 32 GB RAM. CPU architecture, GPU, Docker version, and Firefox version remain open. The owner performs technical checks and approves releases after his girlfriend validates crochet workflows. The existing Standard Versioning Policy applies.

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
