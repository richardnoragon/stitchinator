# User Guide

Planned workflow only; installation commands and implemented UI instructions are not yet available.

## Intended workflow

1. Run Stitchinator through Docker on a local Windows, Linux, or macOS computer and open its browser interface on that computer. No login is required.
2. Create a crochet project and select US, UK, or German stitch terminology. Interface and instruction prose remain US English. Measurements use metric units.
3. Enter yarn inventory, desired dimensions, and measured swatch information.
4. Design through templates, free drawing, and manual stitch placement. Flat rows, joined rounds, spiral rounds, and joined pieces are supported requirements.
5. Review the symbol chart, textured 2D shape, and approximate 3D preview. Preview dimension or stitch changes immediately, then use Apply to commit them.
6. Review stitch/row calculations and yarn estimates separately for each yarn, including a configurable allowance.
7. Optionally generate bullet-style instructions. Select export contents and produce a printable PDF or PNG picture.
8. Use autosave and portable project files for continued work and transfer. Crash recovery is required; exact recovery and backup instructions remain to be defined.

## Open details

Storage location and detailed UI remain to be specified. The scarf is the baseline example; real measurements are deferred. Confirmed templates, inventory, editing, and backup behavior are described below.

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

## Backup timing and updates

Create a full backup when the destination is first configured. Thereafter, run at the first opportunity each day while the app is running, using the computer's local timezone: a full on the first of each month, otherwise an incremental. Run overdue work at startup. Restoration stops if the required safety backup fails.

Updates are started manually and require a full safety backup before changes to stored data. Initial platform validation is on Kubuntu only; installation and update commands remain pending implementation.

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

## Available in prototype alpha.3

Generate optional sample-chart instructions, choose row reading order, edit row text, and add finishing notes. Chart changes flag affected rows and display regenerated suggestions alongside saved text. Choose Use regenerated text or Keep my text — reviewed for each affected row. Text for removed rows remains available for reference. These are sample-chart instructions only; foundation/turning chains, placement details, and complete garment instructions are not generated. The gauge summary compares approximate chart dimensions with committed target dimensions without choosing a rounding policy.

## Available in prototype alpha.4

Select export contents under Export your design, then preview. Preferences are saved with the project. Resolve pending size changes first. Warnings appear in preview and output; acknowledge them to enable saving. Download the displayed page as PNG or use Print / Save all pages as PDF and select the browser's PDF destination. PDF pages contain rendered images, not selectable text. Select Previous/Next for multi-page previews. Yarn estimates are freshly calculated; saved instruction edits are preserved and stale rows are flagged.

## Available in prototype alpha.5

Use Design revisions to save a distinctive name and search by name. Restore asks for confirmation and preserves the current design and restored design as new named entries, retaining all history. Pending size edits must be applied or cancelled. Revision operations clear the transient undo/redo stack; recover earlier designs through saved revisions. History is included in project downloads. Prototype limits are 100 entries and 2 MB for the whole project. Automatic backups remain unimplemented.

## Available in prototype alpha.6

Create or open projects in the Project library. Save descriptions, comma-separated tags, and paths such as Gifts/Scarves under Project details. Search across names, descriptions, tags, and folder paths; parent-folder filters include descendants. Projects retain independent revisions and export preferences. Duplicate imports offer Open existing or Import as a separate copy. A failed save cancels switching; stale-tab conflicts require downloading edits before reload. Deletion and empty-folder management remain unimplemented.

## Available in prototype alpha.7

The Collection backups panel shows the last successful backup, overdue/failure information, and the schedule clock. Back up now captures the saved collection. Select a date/time restore point to restore the entire library; current edits must save successfully and a full safety backup must complete first. Restoration replaces the active collection and reloads the page. Other tabs must refresh before saving. Current Compose defaults use the prepared host folder `backups/automatic`; see the root README for external-drive setup. Keep its marker and dependent backup files together.

## Multiple rectangular pieces — current prototype

Add a distinctive name under **Project pieces**, then enter that piece's dimensions and measured swatch. Set **Quantity** and save piece details for repeated identical pieces such as handles. Select another piece to edit its chart and instructions. Apply or cancel pending dimensions and save piece details before switching.

**Calculate all piece estimates** shows quantity-adjusted requirements for each design and total grams. Missing measurements prevent a complete total. Exports and the approximate 3D preview currently cover only the selected piece; exported documents identify its name and quantity. Named revisions, downloaded project JSON, and backups retain all pieces. Yarn stock allocation and completed-row tracking are still planned.

## Per-copy progress — alpha.9

Under **Making progress**, select a copy and enter the number of completed full-piece rows and a stopping note. Progress saves when a field loses focus or when you select **Save progress**. Counts are manual and are not limited by the sample chart. Repeated copies share a design but have independent progress.

Design changes flag previously recorded progress for review. Choose **Retain progress for this design** after checking your work, or **Reset this copy’s progress**, which asks for confirmation. Saving progress also acknowledges the current design. Design undo/redo and named revision restoration preserve current progress. Collection backup restoration restores the progress recorded at that backup point.

Reducing a quantity or restoring a revision without a piece retains its inactive progress records. Restoring the same piece identity or increasing its quantity makes those records available again. Portable JSON and collection backups include progress; PDF/PNG design exports currently do not. Round tracking will accompany round construction support.

## Personal yarn inventory — alpha.10

Open **Personal yarn inventory** in the sidebar. Create a separate record for each yarn/color/dye lot, with a descriptive lot name, brand, product, fiber composition, color, dye lot, and weight/category. Record grams and meters per skein and the remaining grams, including partial skeins. Remaining meters are calculated from those specifications. Zero remaining stock is allowed.

Choose round yarn with optional diameter, or flat yarn with optional width and thickness, in millimeters. Optional cost per skein and a three-letter currency code are informational; project costing is not yet calculated. Search matches the lot's text fields. Use **Edit lot** to correct its details or remaining grams, then **Save yarn lot**. Inventory edits require explicit saving and are independent of project autosave. There is no deletion control while deletion policy remains deferred.

Inventory is shared across projects and included in full, incremental, and safety backups. Restoring a backup predating inventory returns the inventory to empty; the mandatory safety backup retains the current inventory for recovery. Ordinary project JSON downloads do not include the shared stock collection. **Download inventory / draft** preserves current inventory and unsaved form edits as JSON; importing that standalone file is not yet implemented. If another tab changes inventory, saving is rejected: download your draft, reload inventory, and reapply your edits.

Stock is manually recorded at this stage. The assignment and reservation workflow is described below. Consumption accounting is described below; inventory edits do not silently change project yarn estimates. The prototype supports up to 1,000 lot records within the existing 2 MB request limit.

## Yarn assignments and reservations — alpha.11

Under **Yarn assignment and reservations**, refresh the yarn list, choose a lot, and apply it to the selected piece. This initial workflow assigns one dye lot to each entire piece. Applying copies the yarn record and its grams/meters per skein; it clears swatch measurements so you can enter measurements matching that yarn. Inventory changes never silently rewrite saved piece specifications. Reapplying is explicit and clears the swatch again. Multiple yarns within one piece and splitting a piece across lots are still planned.

Use **Review stock and reservations** to see the current requirements, existing commitments, owned grams, other projects' commitments, and shortage to purchase. Matching yarn/color with different dye lots produces a warning. Refresh the review after stock or other projects change. The saved design, not pending dimension previews, supplies the estimate.

Choose **Ready to make**, then **Review and apply status** and approve the displayed requirements. Every piece must have an inventory lot and valid measurements. Insufficient stock does not block approval: commitments record the required grams, including unmet demand; they do not increase owned stock or deduct consumption. Available grams are `max(owned − other projects’ commitments, 0)`. Shortage is the remaining unmet requirement. Competing projects are listed. No automatic priority or split-lot allocation is assigned.

Applied design changes keep existing commitments and show **Reservation needs review** until reconciled. Canceling the approval leaves both the edited design and existing commitments intact. **On hold** and **In progress** retain commitments unless you check **Update commitments**; these statuses require entering Ready to make first. **Completed**, **Abandoned**, and **Draft** release commitments. Record actual usage using the consumption workflow below; it updates remaining stock and effective commitments together.

Approvals are checked against the whole saved collection. If stock or any project changes after preview, review again. Ordinary project saves, portable imports, design undo/redo, and revision restoration cannot create or release stock commitments. New imports start as Draft. Collection backups restore statuses and commitments together with inventory. Older application versions should not be used to modify this data; roll back with a matching pre-upgrade copy.

## Actual yarn consumption — alpha.12

Open **Actual yarn consumption**, then **Refresh usage**. Select the lot actually used, enter grams and a note, and review the stock change before saving. Consumption can be recorded independently of the estimated amount or project status. It must not exceed recorded owned stock: correct or replenish inventory first if stock records are incomplete. Usage exceeding an estimate is allowed when owned stock is sufficient.

Choose **Correct entry** to enter a corrected total, not an additional amount. A correction requires an explanation. Set the corrected total to zero to remove the usage; the entry remains visible as removed, with its history. To correct a wrong lot or project, remove the mistaken entry and record a new one in the correct place. Refresh before editing if another tab, stock edit, or project change has invalidated the displayed versions.

Stock changes by the difference between old and corrected usage. Effective active commitments are `max(approved requirement − actual use for that project/lot, 0)`. Corrections can increase a still-active commitment up to its approved requirement, but never revive a released commitment after Completed, Abandoned, or Draft. Reviewing or approving a revised requirement does not deduct stock again. Consumption does not automatically change project status.

Consumption describes prior work and survives design revision restoration. Review it explicitly when adapting an earlier design. Collection backups restore the inventory, consumption history, statuses, and approved requirements together. Project JSON downloads alone do not include the shared consumption ledger; use collection backups for full recovery. Imported copies have no recorded consumption and start as Draft.

Consumption and stock are saved in one atomic inventory-file replacement, with version checks preventing duplicate retries. Inventory forms cannot rewrite consumption history. Keep inventory corrections separate from usage: do not manually deduct the same consumption a second time. History is bounded by 10,000 entries, 1,000 changes per entry, and the shared 2 MB inventory limit. Usage remains project/lot based; per-piece accounting and split-lot design allocation are future work.

## Multiple yarn bands and split dye lots — alpha.13

Use **Yarn bands** for rectangular bands arranged along a piece's length. Each band spans the full width and has a name, stitch-pattern description, preview color, length percentage, measured swatch, hook, and blocking state. Saving the first band activates band mode; yarn estimates then use the bands rather than the main swatch. A single 100% band also supports splitting a whole piece across dye lots.

Refresh band yarn lots, choose a lot and its percentage of the band's yarn, and add it to the draft. Prefer one sufficient lot at 100%; if you choose to mix lots, add each explicitly with shares totaling 100%. Split lots must match brand, product, fiber, color, weight category, shape, dimensions, and skein specifications. Dye lot, stock quantity, and display name may differ. A different yarn or color belongs in another band. Use a swatch representative of the yarn/stitch fabric in that band.

Save each band. All band length percentages must total 100% before estimates or reservation approval are available. Incomplete swatches may be saved for design work, but there is no fallback estimate. The prototype supports 32 bands and 8 distinct lots per band within the existing project-size limit. Move bands up/down to change their order, edit their saved details and allocations, or remove them. Removing the last band, or selecting **Return to single-yarn mode**, restores use of the retained main swatch and whole-piece assignment. Undo and named revisions can recover prior band definitions.

2D/3D previews show exact band boundaries and selected colors with approximate texture. Charts remain a separate sample: band definitions do not automatically place stitches, produce transitions between gauges, or generate joining instructions. Counts are calculated separately per band and copy before rounding. Different gauge fabrics may need manual transition design. This model does not represent yarns held together, interwoven colorwork, arbitrary patches, or realistic drape.

Rust calculates area-based requirements for each band, applies project allowance and piece quantity once, then splits grams/meters/skein equivalents by lot share. Reservations use those same lot totals and still require explicit review after edits. Exports show per-lot requirements and each band's gauge counts. Band definitions, copied yarn specifications, swatches, colors, and allocations travel with project JSON, named revisions, and collection backups. Stock itself remains in the shared inventory.

## Flat shape previews and estimates — alpha.14

Choose **Piece shape** to preview a rectangle, circle, oval (ellipse), or triangle with a centered apex. Use **Apply shape** to commit it; **Cancel shape preview** returns to the saved design. Pending shape previews are excluded from autosave and block estimates, exports, reservations, and backup actions that require a committed design.

A circle uses Width as its diameter and hides Length; the prior length is retained for switching back to another shape. An ellipse uses both full axes. A triangle uses base width and height, with the apex at the top of the preview. All sizes are centimeters. The 3D view is still a simple curved sheet approximation, not a finished bag or physical drape simulation.

Yarn requirements use geometric fabric area and the matching measured swatch: rectangle `width × length`, circle `π × diameter² / 4`, ellipse `π × width × length / 4`, triangle `base × height / 2`. Quantity and allowance apply once. Bands remain positioned by their percentage of the shape's height/length, but yarn estimates integrate the actual area inside the shape; equal-height triangle bands do not have equal area. Lot allocations and consumption accounting use those same requirements.

These are flat-shape design aids, not round-construction patterns. The chart remains a rectangular sample and does not generate increases/decreases, radial placement, round counts, foundation instructions, or gauge transitions. Shaped-piece API calculations omit stitch/row counts, and exports include a visible warning. Use measurements representative of the intended fabric; real crochet accuracy remains unvalidated. Applied shapes travel with project JSON, revisions, and collection backups, and flag existing progress/reservations for review as appropriate.

## Radial sample charts — alpha.15

Under **Radial sample chart**, create a chart for the selected piece. It is independent of the existing rectangular sample. Choose joined-round rings or a continuous-spiral layout and clockwise or counterclockwise reading order. Slot 1 marks the start of each round. Add rounds and choose 1–120 symbol slots per round, up to 20 rounds. A slot holds one stitch symbol; its produced stitch count comes from the shared stitch definition, so six increase symbols can produce twelve stitches.

Choose a stitch and click a symbol to paint it. Keyboard focus plus Enter/Space also paints. Custom drawn/imported symbols are supported. The selected round is highlighted. You can remove a round (keeping at least one), resize its slots, or position a symbol using angular and radial offsets. Position changes affect the diagram only, not reading order or stitch counts. Undo/redo and named revisions retain the chart. Dense charts may need browser zoom or manual positioning.

**Use generated round instructions** creates a bullet-style round summary with grouped stitch names and consumed/produced totals. Edit notes and save them; leaving the text field also attempts to save. Chart or definition changes preserve the text and flag it for review. Compare the generated version, then keep your text as reviewed or explicitly replace it. Pending changes that block a note save retain the draft; save or discard it before switching work or exporting. Each note is limited to 4,000 characters.

Count warnings compare each round's consumption with the preceding round's produced stitches. These checks do not prove a valid crochet construction: specify the starting ring, join/slip stitch, turning chains, placement, and shaping manually. A joined layout does not insert a join; a spiral layout does not insert closing joins or automatically resize rounds. The chart does not determine full-piece dimensions, round count, or yarn consumption; measured swatches and geometric area remain the estimate inputs.

Download the radial sample directly as a 1600×1600 PNG. Normal chart exports include both radial and rectangular samples and their legends; instruction exports include saved round notes with review warnings. Project JSON, revisions and collection backups preserve mode, direction, cells, manual offsets and notes. Progress remains a manually recorded number of rows/rounds for each copy; chart edits flag it for review without changing the count.

## Explicit round construction — alpha.16

Choose a magic ring or a joined chain ring (1–20 chains) under Starting ring. For each selected round, choose 0–6 starting chains, whether they count as one additional produced stitch, whether to turn before the round, and the end-of-round join. These operations are separate from painted chart symbols: do not paint them again. A join adds no stitch; a counted starting chain adds one. With zero chains, the counted option clears automatically.

Unspecified construction remains available for old projects. Spiral/join conflicts and joins to missing chains produce warnings. Changing layout never rewrites construction choices. Generate round text explicitly to include the rules; existing custom text remains unchanged and needs review after rule edits. Rules are saved with projects, portable files, revisions and backups. Printed/exported saved instructions include rules after regeneration or manual editing. The standalone diagram does not draw foundation chains or joins. Stitch placement, shaping, and full-piece crochet correctness still require manual checking.

## Stitch placement guidance — alpha.17

Open Stitch placement and shaping counts in the radial editor. Select a round and choose Sequential in working order to assign consecutive base-stitch ranges from each symbol’s declared consumed count. Round 1 works into the starting ring. Previous-round stitch numbering follows working order after any turn, not diagram angles; specify the physical starting stitch and loops in your notes. Zero-consumption symbols need manual attachment instructions. Shared bases, skipped stitches and chain spaces require custom notes.

The table shows consumed/produced counts and each symbol’s net change. Round summaries include counted starting chains and warn about unworked or insufficient base stitches. Generated notes include sequential ranges only after you enable placement and explicitly regenerate. Earlier-round output changes flag affected saved notes for review. Long generated instructions can exceed the existing 4,000-character limit; shorten the sample or write concise custom notes. Counts do not establish flatness, finished dimensions or yarn usage; existing estimates remain swatch/area based.

## Assembly concept preview — alpha.18

Assembly preview shows every current piece copy. Select a copy, adjust its horizontal/vertical/depth position in centimeters and its X/Y/Z rotation in degrees. Changes apply when you finish moving a slider. The view fits all pieces automatically. View rotation and label visibility affect the current preview only. Download assembly PNG captures this view; existing PDF/picture exports still show the active individual piece.

Each copy’s placement is saved with the project and named revisions. Reset selected copy placement restores its automatic grid position. Reducing quantity hides extra copies but retains their saved placements if quantity is increased later. Copies without saved placements use a grid that reflows when quantities change. Missing dimensions omit a piece and produce a message. Resolve pending design edits before changing placements or downloading.

Pieces are rigid flat shapes colored by yarn bands, with simple depth sorting. Intersecting panels can display imperfect overlaps. This is a concept layout, not a seam, fold, stitch-texture or drape simulation. It does not alter crochet instructions, dimensions, progress or yarn estimates.

## Seam plans and controlled folds — alpha.19

Under Assembly preview, use Seam relationships to select two piece copies and their edges. Give the seam a descriptive name, choose whether the second edge direction is reversed, and enter the joining method and instructions. Save / mark seam reviewed stores it. Select an existing seam to edit or remove it; Undo recovers removal. You may join different edges on the same copy. The same exact edge cannot be both endpoints. Up to 100 seams are supported.

Edges refer to the original flat piece. Rectangle edges run clockwise from the top-left. Triangle edges follow left-base → tip → right-base → left-base. Circle and oval edges are quarter arcs: the top quarter starts at the upper-left diagonal and runs clockwise. Arc lengths are approximate. Colored guides mark both edges; dashed lines match their starts, midpoints and ends. Guides annotate relationships and do not snap, sew or constrain pieces. Unequal lengths require your own easing or design decisions. Changing quantity, shape or dimensions can make an endpoint unavailable; it remains saved for correction. Geometry or fold changes flag a seam for review. Save it again after reviewing.

Project assembly notes have an explicit Save button. Save or discard seam/note drafts before switching projects, undoing, restoring, exporting, or changing placements and folds. The discard button clears both kinds of assembly drafts. Notes are limited to 4,000 characters and seam notes to 2,000 each. Saved notes, seam descriptions, fold settings and warnings are included in document exports when Notes is enabled; the assembly PNG contains the visible geometry and guides.

For controlled folds, select a piece copy and enable one fold. Choose a line at constant X (across width) or Y (across height), its position from 1–99% of the flat bounding dimension, the positive (right/bottom) or negative (left/top) side, and an angle from −180° to 180°. The fold happens before placement rotations. At 0° the piece is flat; at ±180° the selected side folds back. The signed distance from the crease multiplied by sin(angle) sets the depth displacement. Disabling the fold removes its settings. Reset selected copy placement also removes its fold; Undo recovers it. Hidden-copy placements/folds are retained if quantity is reduced.

Folds are rigid geometric hinges, one per copy. Mesh facets and approximate depth sorting can show overlap artifacts. There is no thickness, collision, drape, automatic seam alignment, seam-yarn allowance or fabric stretching model. Folds do not change piece dimensions, crochet instructions or yarn estimates.

## Expanded workflows — alpha.20

Assembly alignment: select a saved seam and Preview selected seam alignment. The second copy rotates/translates to match edge endpoint direction and midpoint. The sampled mismatch is in centimeters; no scaling or stretching occurs. Apply commits the pose; Cancel preserves it. Other seams on the moving copy may move. A preview blocks navigation/export until resolved. Copies can now have up to eight parallel fold lines, applied in list order. Select a fold to edit; Add parallel fold adds a flat hinge; unchecking Enable removes the selected fold. Creases are located in the original flat piece. Crossing-axis fold sequences are rejected.

The open-top bag template previews three new piece designs (five copies) and eight seam relationships. Apply appends them to the current project. Enter real swatches and yarn assignments; the template does not infer seam take-up, handles, closures or a full stitch pattern. Preview again if the design changes before Apply.

Photos accept JPEG/PNG/WebP up to 10 MB and 40 megapixels. Up to eight are stored as compact JPEGs, maximum 640 pixels and 200,000 characters each, within the existing 2 MB project limit. Keep originals separately. Photos follow named revisions and portable files. Remove is undoable. Notes exports include project photos. Include all piece designs combines documents for each design, showing quantity; combined exports are capped at 100 pages.

Crochet terminology applies US, UK or German names/abbreviations to recognized standard definitions. Custom names remain unchanged. Optionally add missing standard stitches and explicitly specified cluster/shell/increase/decrease examples. Reviewed instruction text is never silently translated. Definitions use the Craft Yarn Council US/UK terminology and DROPS German names; prose remains English. [CYC crochet abbreviations](https://www.craftyarncouncil.com/standards/crochet-abbreviations), [DROPS German stitch terms](https://www.garnstudio.com/videos.php?c=crochet-videos-basic-stitches&lang=de).

Shaping suggestions and settings opens a dialog for the selected radial round. Suggestions default on per project and can be disabled. For round 2 onward, choose regular 1→1, increase 1→2 and decrease 2→1 definitions and an integer output target. Preview shows an evenly distributed count plan; Apply replaces that sample round and clears its manual symbol offsets. Notes remain for review. This does not establish flatness or derive a full pattern from dimensions.

Patterns now accept descriptions, tags and nested folder paths, with search and a folder filter. Reuse patterns from another project loads a saved source snapshot. Preview/Apply imports independent definitions. Checking Update previously imported stitch definitions explicitly updates those definitions, potentially affecting charts using them. Source edits never propagate automatically. Named source patterns should retain stable IDs; legacy patterns without IDs are identified by their source list index.

Focused working view enlarges the selected piece’s sample chart and highlights the current row/round. Previous/Next only navigates; saved completed counts remain under the existing progress controls. It does not expand a sample repeat into a full-piece pattern.

Knitting is enabled under Project craft. Apply adds knit, purl, yarn-over, k2tog, ssk, p2tog, kfb, M1L and M1R definitions without replacing existing charts. Choose flat rows or circular rounds per piece. Circular instructions read every grid row right-to-left and call it a round. Symbols indicate what to work on that row, not the right-side fabric appearance. Enter cast-on, circular join and bind-off details in your notes; gauge must come from the intended knitting fabric. Crochet radial controls are hidden in knitting mode, and their saved data remains available when returning to crochet. [CYC knitting abbreviations](https://www.craftyarncouncil.com/standards/knitting-abbreviations).

The offline starter catalog is under Personal yarn inventory. Search and Use as new lot draft copies product/fiber/weight/length specifications, with zero owned grams. Enter color, dye lot and actual quantity before saving. Manufacturer data was checked October 27, 2026; verify the ball band. No price, availability or gauge is assumed. Reference sources: [DROPS Paris](https://www.garnstudio.com/yarn.php?show=drops-paris&cid=19), [DROPS Lima](https://www.garnstudio.com/yarn.php?show=drops-lima&cid=19), [DROPS Alpaca](https://www.garnstudio.com/yarn.php?show=drops-alpaca&cid=19). Runtime performs no catalog network requests.
