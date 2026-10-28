# Stitchinator user guide

Operational guide for the current internal prototype, including the unreleased editor, shared picture library and amigurumi additions. Read the [repository overview](../README.md) for status and the [testing guide](TESTING.md) for validation limits.

## Run with Docker

```sh
python3 scripts/prepare_backups.py
docker compose up --build -d
```

Open **http://127.0.0.1:8080** in Firefox. Docker publishes the port only on the host's loopback address. The application has no external fonts, scripts, or runtime services. Initial builds download build dependencies; subsequent application use works offline.

```sh
docker compose down
```

The named `stitchinator-data` volume retains the project collection across container replacement. Do not remove the volume if you want to retain the project. Automatic collection backups are configured through a separate host folder; use **Download project** for individual portable copies. Projects are stored independently. Importing never overwrites an existing project; matching project IDs offer Open existing or Import as a separate copy.

## Supplied image workflow

On the build computer:

```sh
docker compose build
docker save -o stitchinator-v0.1.0-alpha.20.tar stitchinator:v0.1.0-alpha.20
```

For the current Linux packaging, transfer the archive, `compose.yaml`, and `scripts/prepare_backups.py` (preserving its directory) to another computer, then:

```sh
python3 scripts/prepare_backups.py
docker load -i stitchinator-v0.1.0-alpha.20.tar
docker compose up -d --no-build
```

The tag currently identifies a local development candidate, not an approved published release. Freeze release tags before distributing artifacts; do not overwrite a distributed tag. Earlier image archives predate Git initialization and have no verified source-commit provenance. The first repository snapshot does not retroactively approve those artifacts or constitute a release.

## Available in this increment

- Rectangular sample chart, stitch painting, undo/redo, and preview/Apply resizing.
- Custom stitches with names, abbreviations, text/drawn/imported SVG or PNG symbols, existing-symbol copying, and consumed/produced counts. Imported images are normalized to PNG.
- Select a rectangular repeat region with two corner clicks, or save the whole chart as a named tile, then repeat it across the chart.
- Measured-swatch estimates calculated in Rust, including grams, meters, skein equivalents, and configurable allowance (10% initially).
- Optional editable sample-chart row instructions, repeated-group counts, selectable reading direction, and finishing notes. Changed rows preserve your text and offer regenerated suggestions for review. Removed rows are retained for reference.
- Gauge-based sample-chart dimensions computed from produced stitch totals, without automatically resizing or rounding the design.
- Dimension preview/Apply, 2D shape and rotatable approximate 3D fabric preview.
- Local autosave, reload, and JSON project download/import, including custom stitches and patterns.
- Chart zoom, interface text sizing, and keyboard-operable controls.

## Try it

1. Create a custom stitch under **Create a custom stitch**, select it in the palette, and click chart cells to place it.
2. Name your chart under **Reusable patterns** and save it as a pattern. Resize the sample chart, apply the size, and repeat the saved tile.
3. Enter the intended physical dimensions, preview them, and click **Apply dimensions**.
4. Enter measured swatch dimensions, stitch/row counts, fabric weight, and yarn meters/grams per skein. Click **Calculate estimate**.
5. Rotate the fabric preview and download your project.

Single-yarn estimates assume a measured swatch representative of the **entire fabric pattern**. Yarn bands support separate yarn/swatches and split-lot allocations, as described below. They scale weight by area and apply the allowance once. The sample chart is not automatically resized to the calculated counts. Counts remain fractional where applicable because exact-size rounding rules are deferred. A change in stitch pattern requires an appropriate new swatch. The approximate preview does not simulate individual stitch geometry or physical drape.

Row validation compares each row’s consumed total with the previous row’s produced total. It does not validate stitch connectivity, foundation/turning chains, or rounds, and does not block editing. SVG import accepts simple shapes only (no text, external references, scripts, or embedded images); use PNG for more complex artwork. Individual image inputs are limited to 256 KB, normalized to 96 × 96 pixels. Project files retain the existing 2 MB limit.

## Collection backups and restore

The Linux Compose configuration mounts a host folder at `/backups` and the host's `/etc/localtime` read-only. The default destination is `backups/automatic`, outside the container and data volume. Run `python3 scripts/prepare_backups.py` before starting Compose; it creates the destination marker and grants the container access through the host folder's group. The default group ID is 1000; use the values printed by the script if yours differs.

For another destination (including an external drive), mount the drive first, then run:

```sh
python3 scripts/prepare_backups.py /path/to/your/backup-folder
```

Set `STITCHINATOR_BACKUP_DIR` and `STITCHINATOR_BACKUP_GID` in the shell or a local `.env` file using the printed values, then recreate the container with `docker compose up -d --no-build`. Compose does not silently create a missing bind source. The destination marker must remain present. Some disconnected/remounted drives may require recreating the container to refresh the bind mount.

- First backup: full, at startup after the destination is configured.
- Monthly: a full backup at the first running opportunity in a new calendar month (normally the first day), replacing that day's incremental.
- Daily: incremental backups of changed projects, checked every minute while running. Missed days capture only the current state at the next opportunity; historical states are not invented.
- Manual: Back up now makes a full if a baseline/new monthly cycle is due, otherwise an incremental, even on the same day.
- Retention: keep the newest three monthly cycles, with their complete dependency chains. Safety backups are full snapshots in their creation month's cycle. No pruning runs during restoration.

The sidebar shows last success, overdue state, failures, and the schedule's local clock. Unavailable destinations produce warnings without blocking editing. Failed backups retry every minute. Backup JSON files include SHA-256 checksums; an invalid file or missing dependency stops restore rather than silently skipping data.

Choose a date/time restore point and confirm **Restore entire collection**. Current edits are saved first. Restore validates the selected chain, requires a full safety backup, stages the replacement library, and then switches directories while holding the save lock. A failed safety backup stops restoration. Startup recovery handles an interrupted directory switch. Project versions are advanced so stale tabs cannot overwrite restored data. Projects created after the selected point leave the active library but remain in the safety backup. Refresh other open tabs after downloading any unsaved edits.

Backups contain the shared yarn inventory and all active project JSON data: charts, metadata, revisions, embedded symbols, instructions, and export settings. They exclude the unused pre-library migration file and runtime bookkeeping. They are not encrypted. Automatic backups are not enabled for native `cargo run` unless `STITCHINATOR_BACKUPS` points to a prepared folder outside `STITCHINATOR_DATA`. Backups require a readable current collection; if current project JSON is corrupt, the safety-backup requirement blocks restore until the corruption is addressed or the data is recovered externally.

## Project library

Create and switch between projects in the sidebar. Under **Project details**, enter a description, comma-separated tags, and a folder path such as `Gifts/Scarves`, then save the details. Search matches names, descriptions, tags, and paths without regard to case. A parent-folder filter includes its subfolders. Folder paths are created by assigning projects to them; empty-folder management and deletion remain unimplemented while deletion policy is deferred.

Switching first saves the current design and stops if saving fails. Project files have independent IDs and version checks reject stale writes from other tabs. If a conflict occurs, download your edits before reloading. New projects start with a fresh chart and no revisions. Export settings and history remain project-specific.

On first startup after upgrading from alpha.5, the original `/data/project.json` is copied into `/data/projects/legacy.json`, keeping the original file untouched. New projects live in `/data/projects/<id>.json`. The last opened project is remembered in the browser. Older open tabs cannot write through the retired single-workspace endpoint: download any unsaved work there before refreshing. To roll back, stop the new version and use a pre-upgrade backup with the old image; the retained original does not include edits made after migration.

## Multiple pieces

Use **Project pieces** to add a named rectangular design, switch the editor to it, or change its name and quantity (1–99). Each project supports up to 32 designs within the existing 2 MB file limit. Save piece details and apply or cancel pending dimensions before switching. New pieces start with a blank chart and require their own measured swatch.

Each piece retains its dimensions, color, chart, swatch, yarn specifications, and saved instructions. Custom stitches and reusable patterns are shared within the project, as are its name, yarn allowance, and interface text size. Quantities multiply yarn consumption without multiplying the dimensions or chart counts for one copy. **Calculate all piece estimates** reports each design and its quantity; the total mass is unavailable until every piece has valid measurements. Inventory allocation, shortage reporting and actual consumption use the workflows below.

Previews and PDF/PNG exports identify each piece and its quantity. Use Include all piece designs for combined documents; assembly concepts also have a standalone PNG download. Revisions, portable project JSON, and collection backups include every piece.

Older project files and their revision snapshots open as a single **Main piece** and save in schema 2. After that save, older application tabs are prevented from replacing the project with schema 1. Download unsaved changes in older tabs before refreshing. Use a pre-upgrade backup if rolling back the application.

## Named revisions

Use **Design revisions** to save a descriptive milestone, then search by any part of its name (case-insensitive). Names must be distinctive; duplicate names are rejected. Autosave does not create named revisions.

Restoring asks for confirmation, records the current design as **Before restoring: …**, restores the selected design, and adds **Restored: …**. All existing history remains intact. Revision operations start a new undo/redo session; return to earlier designs through their saved revisions. Pending size edits must be applied or cancelled first.

Revisions include design fields, charts, custom stitches, patterns, instructions, and export preferences. History travels inside JSON project downloads and persists with local saves. This prototype supports up to 100 revisions within its existing 2 MB total project-file limit; operations that exceed either limit are rejected without changing the design. Named history is not a substitute for an external backup. Revision history belongs to each project independently.

## Exporting

Choose chart/legend, fabric picture, yarn estimate, saved instructions, and finishing notes under **Export your design**, then **Preview export**. Preferences travel with your project. Apply or cancel pending size edits first. Review any warnings and acknowledge them to enable output; warnings are also included in the file.

- **Download this page as PNG** saves the displayed 1200 × 1600 page. Use Previous/Next for multi-page exports.
- **Print / Save all pages as PDF** opens the browser print dialog. Choose its PDF destination. All preview pages use an A4 print layout. This first implementation produces image-based pages, so PDF text is not selectable. Browser print settings can change margins or scaling.

The preview uses a frozen copy of the committed project and recalculates yarn estimates through Rust. Instructions use your saved edits; missing or out-of-date rows are flagged rather than silently regenerated. Removed-row text stays in the project and is excluded from export. Output is capped at 20 pages; shorten content or export fewer sections if needed.

## Still planned

Stitch-level multi-yarn colorwork, yarns held together, validated full-piece construction, calibrated amigurumi consumption and further pattern-editing improvements remain open. The full agreed requirements remain in [the planning documents](README.md). Licensing and other explicitly deferred decisions remain unresolved.

## Development and checks

```sh
cargo run
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

Native execution binds to `127.0.0.1:8080` and saves under `data/`. Override `STITCHINATOR_DATA` for disposable data. Docker uses `/data` and binds internally to all container interfaces; Compose restricts host access to loopback.

Browser checks use isolated temporary storage and port 18089:

```sh
npm ci
npx playwright install chromium firefox
cargo build
npm run test:logic
npm run test:browser
```

Node and Playwright are test dependencies only. The browser interface is plain JavaScript/CSS served by Rust. Browser tests use synthetic measurements; real crochet measurements remain deferred. Windows and macOS have not been verified.

Instruction generation currently describes the sample chart only. Radial charts can record explicit foundation/chain/join rules and placement guidance; neither chart type supplies a validated full garment pattern. Count warnings remain visible above the editor. Reading order is explicit and saved per project. “Keep my text — reviewed” acknowledges the current chart while retaining edits; “Use regenerated text” replaces only that row. Finishing notes are never regenerated.

## Per-copy progress — alpha.9

Under **Making progress**, select a copy and enter the number of completed full-piece rows and a stopping note. Progress saves when a field loses focus or when you select **Save progress**. Counts are manual and are not limited by the sample chart. Repeated copies share a design but have independent progress.

Design changes flag previously recorded progress for review. Choose **Retain progress for this design** after checking your work, or **Reset this copy’s progress**, which asks for confirmation. Saving progress also acknowledges the current design. Design undo/redo and named revision restoration preserve current progress. Collection backup restoration restores the progress recorded at that backup point.

Reducing a quantity or restoring a revision without a piece retains its inactive progress records. Restoring the same piece identity or increasing its quantity makes those records available again. Portable JSON and collection backups include progress; PDF/PNG design exports currently do not. Round tracking will accompany round construction support.

## Personal yarn inventory — alpha.10

Open **Personal yarn inventory** in the sidebar. Create a separate record for each yarn/color/dye lot, with a descriptive lot name, brand, product, fiber composition, color, dye lot, and weight/category. Record grams and meters per skein and the remaining grams, including partial skeins. Remaining meters are calculated from those specifications. Zero remaining stock is allowed.

Choose round yarn with optional diameter, or flat yarn with optional width and thickness, in millimeters. Optional cost per skein and a three-letter currency code are informational; project costing is not yet calculated. Search matches the lot's text fields. Use **Edit lot** to correct its details or remaining grams, then **Save yarn lot**. Inventory edits require explicit saving and are independent of project autosave. There is no deletion control while deletion policy remains deferred.

Inventory is shared across projects and included in full, incremental, and safety backups. Restoring a backup predating inventory returns the inventory to empty; the mandatory safety backup retains the current inventory for recovery. Ordinary project JSON downloads do not include the shared stock collection. **Download inventory / draft** preserves current inventory and unsaved form edits as JSON; importing that standalone file is not yet implemented. If another tab changes inventory, saving is rejected: download your draft, reload inventory, and reapply your edits.

Stock is manually recorded at this stage. The assignment and reservation workflow is described below. Consumption accounting is described below; inventory edits do not silently change project yarn estimates. The prototype supports up to 1,000 lot records within the existing 2 MB request limit.

Older application versions do not understand inventory backup records. Roll back using the matching pre-upgrade data copy and image, preserving current data separately.

## Yarn assignments and reservations — alpha.11

Under **Yarn assignment and reservations**, refresh the yarn list, choose a lot, and apply it to the selected piece. This initial workflow assigns one dye lot to each entire piece. Applying copies the yarn record and its grams/meters per skein; it clears swatch measurements so you can enter measurements matching that yarn. Inventory changes never silently rewrite saved piece specifications. Reapplying is explicit and clears the swatch again. Use the yarn-band workflow below for multiple yarns and split-lot shares.

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

Radial samples now store a starting-ring choice and per-round starting-chain, counted-chain, join and turn rules. Generated notes include these choices and count warnings include counted starting chains. Existing notes are preserved for review. Stitch placement and full-piece shaping still require manual design.

## Stitch placement guidance — alpha.17

Radial samples offer explicit sequential placement, per-symbol base ranges and increase/decrease counts, and warnings for unworked or missing base stitches. Guidance uses declared stitch counts; it does not predict fabric geometry.

## Assembly concept preview — alpha.18

Arrange each piece copy in three dimensions using translations and rotations, with shape and yarn-band colors. Save layouts with projects and revisions or download a standalone PNG. Pieces remain rigid; seams, folds and drape simulation are not included.

## Seam plans and controlled folds — alpha.19

Define named relationships between piece-copy edges, matching direction and joining notes. Add project assembly notes, and fold each copy along one adjustable straight hinge. Preview guides follow the folded geometry; dimensions and yarn estimates remain unchanged. Saved notes and seam/fold descriptions are included when exporting notes.

## Expanded workflows — alpha.20

- Seam alignment with Preview / Apply / Cancel and a reported residual mismatch; up to eight parallel folds per copy.
- Open-top bag template: base, front/back and end panels, quantities, placements and eight named seams. Swatches remain empty until measured.
- Project photos, portable with revisions/backups and included in notes exports; all-piece document export.
- US/UK/German crochet labels and common stitch/shaping definitions, with edited instructions preserved for review.
- Count-based radial shaping proposals with explicit preview/apply and a per-project settings dialog; manual editing remains available.
- Pattern descriptions, tags, nested folder paths, search, and snapshot imports/explicit definition updates from saved source projects.
- Focused working view with enlarged symbols, row/round highlighting and Previous/Next. Navigation does not silently change progress.
- Flat/circular knitting mode with knit/purl, yarn-over, increases/decreases, measured-gauge estimates and existing assembly/inventory workflows. Symbols describe stitches to work, not right-side appearance.
- Three-entry offline starter yarn catalog: DROPS Paris, Lima and Alpaca. Catalog use creates an unsaved stock draft with zero owned grams and no assumed gauge.

This remains an internal prototype. Full-pattern correctness and real consumption need crochet/knitting acceptance work. Rounding, deletion policy, licensing and workflow approval remain deferred; Windows/macOS have not been verified. Physical drape, collision/thickness, crossing fold lines and automatic constraint solving are not implemented.

Offline image archive for this increment: `dist/stitchinator-v0.1.0-alpha.20.tar`, with a sibling SHA-256 checksum. Load it with `docker load -i dist/stitchinator-v0.1.0-alpha.20.tar`, then use `docker compose up -d --no-build`. The supplied image targets Linux amd64; host-platform verification remains separate.

## Editor enhancements following workflow review

Under **Crochet terminology and starter stitches**, use **Apply terminology / stitch additions** with **Add missing standard stitches** checked to install the expanded library in an existing project. The 27 presets cover base stitches, short stitches/picots, turning chains, tall stitches, clusters/shaping, and relief/loop variants. Filter the palette by **Stitch family**. Symbols are drawn locally and stored as portable PNGs; custom symbols remain supported. Definitions specify concrete examples: a picot is a zero-count decorative attachment, and turning-chain presets state their counting convention. Avoid duplicating these through radial construction controls. Symbol names and abbreviations follow project terminology; the symbol key remains authoritative. Reference: [Craft Yarn Council crochet chart symbols](https://craftyarncouncil.com/standards/crochet-chart-symbols).

Open **Symbol snapping and orientation** and keep **Automatic nearest guide / vertex** selected. Use **Position existing symbol** to click or drag a rectangular symbol; radial symbols can be dragged directly. Nearby grid lines, radial round guides, custom line segments/arcs and other symbols’ top/bottom connection vertices participate in snapping. Select **Top**, **Center**, or **Bottom** as the symbol point that meets the target. **Along tangent** aligns the symbol’s longitudinal axis with a guide; **Perpendicular to tangent** aligns it with the guide normal. The manual angle is an additional offset in these modes. Unsnapped placements retain the manual angle. Snap distance is 0.25 rectangular cell units or 10 radial diagram units. Spiral guides follow a sampled spiral.

The settings panel can disable snapping for all new placements or disable vertex snapping separately. Hold **Alt**, or check **Bypass snapping for next symbol only**, for a single unsnapped placement. Existing resolved positions are retained when settings change; guide edits do not create live constraints. Fixed midpoint/corner targets remain available for explicit alignment.

Under **Add line or arc guides**, choose the chart and enter a segment or arc. Rectangular coordinates use cell units from the top-left; radial coordinates use the 640 × 640 diagram from its top-left. Arc angles run clockwise from the right, with 0–360 drawing a full circle. Add up to 64 custom guides per chart; Remove last guide and Undo support corrections. Guides and settings persist with project JSON, revisions and collection backups. Guides are editing aids; chart exports retain the resolved symbol placements. Snapping does not change working order or establish crochet attachment/count rules. The focused working view remains a list of stitches in working order.

## Shared picture pattern library

Open **Picture pattern library — shared across projects** in the editor. Each entry shows a crochet symbol chart, optional finished-fabric photo, description, stitches used, and expandable **How to crochet** instructions. Search matches names, descriptions, instructions and stitch names. Three bundled practice samples start the collection: single crochet rows, half double crochet rows, and single crochet back-loop rib. Starter recipes use US terms, describe their foundation and uncounted turning chains separately, and are small samples rather than sized garment patterns. They use original explanatory text informed by the [Craft Yarn Council single crochet lesson](https://www.craftyarncouncil.com/node/461) and [turning-chain reference](https://www.craftyarncouncil.com/files/DiscoverPDFs/040_CTurning.pdf).

**View / edit a new copy** opens an independent draft. Edit the description and recipe, paint or resize the chart, add stitch definitions from the current project, and add/remove the optional photo. Save requires a unique new name, ignoring case and surrounding whitespace. The source remains unchanged; saved entries cannot be overwritten through the API either. Cancel discards only the draft. A stale save retains the draft and offers **Reload library list, keeping draft** before retrying. Drafts are not autosaved; leaving the page warns about them.

Use **Create pattern from current chart**, or **Save new copy to shared picture library** beside an existing reusable project pattern, to contribute your own samples. **Add to project patterns** copies a library entry and its stitch definitions into that project's reusable patterns without replacing the active chart. The existing Repeat button places the tile. Imported definitions, recipe and photo remain independent snapshots, portable in project JSON and named project revisions.

The shared collection persists locally in `projects/_patterns.json` beside the project files and is excluded from the project picker. Collection backups and restore include it; a single project download contains only that project's imported pattern copies, not the entire shared library. Bundled starters remain available independently of the saved collection. Limits are 100 user-saved patterns, 16 MB for the shared collection, 1–40 rows/columns and 200 definitions per pattern, plus the existing 2 MB save/project limits. Photos accept JPEG/PNG/WebP up to 10 MB/40 megapixels, normalize to a compact JPEG up to 640 pixels, and must fit the 200 KB photo-data limit. This library currently contains rectangular crochet samples; radial charts remain in the radial editor.

## Amigurumi

The **Amigurumi — rounds, stuffed forms and stitch geometry** section handles full amigurumi parts separately from the older radial *sample* editor. Preview a starter ball, or import numbered rounds as new project pieces. Multiple parts and quantities use the existing piece/project controls. Every part has up to 200 rounds, per-round recipes/colors/notes, foundation and joined/spiral choices, stuffing/assembly notes, measured stitches/rounds per 10 cm, and open/closed preview ends. Edit, duplicate or remove rounds through Preview / Apply / Cancel. Count mismatches and imported stated totals remain visible for review. Apply requires acknowledging the reviewed preview and never silently replaces the current project.

Supported written notation includes `sc`, `inc` (two single crochet in one base), `dec`/`sc2tog`, `hdc`, `dc`, `tr`, `sl`/`sl st`, `ch`, counted stitches, nested parenthesized repeats, starred repeats with explicit counts, and consecutive round ranges. Import terminology can be US, UK or German; stored recipes use canonical US keys. For example:

```text
Part: Head (make 1)
R1: 6 sc in MR (6)
R2: 6 inc (12)
R3: (sc, inc) x6 (18)
R4-6: 18 sc (18)
Part: Arms (make 2)
R1: 6 sc in MR (6)
```

Import editable amigurumi bundle JSON, an existing Stitchinator project containing amigurumi pieces, TXT, PDF, or a PNG/JPEG/WebP photo of written instructions. PDF/photo conversion extracts text locally and proposes editable rounds; review all numbers, abbreviations, warnings and retained source annotations. Unknown or ambiguous round tokens block conversion rather than being guessed. Unsupported prose and symbol-only chart pictures can be kept as references and transcribed manually. Photos of finished objects do not determine a unique crochet pattern. You can also attach a PDF/photo as a reference without conversion. Embedded references and extracted source text travel with project JSON, named revisions and collection backups.

The Docker runtime now installs Poppler and Tesseract English/German data. No online OCR or external AI service is used. Native `cargo run` needs `pdfinfo`, `pdftotext`, `pdftoppm` and `tesseract` on PATH, with the selected OCR language installed; missing tools produce an error while typed text and JSON remain usable. PDF conversion handles selectable-text, scanned and mixed-page PDFs, up to 10 pages per request, and has a 60-second processing limit. See [Tesseract command-line documentation](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage) for the underlying OCR tool.

**Stuffed surface** shows a smoothed surface of revolution derived from produced stitch counts and gauge. **Stitch-level yarn loops** adds individual procedural loops over that shape. Drag to orbit, change yaw/pitch/zoom, or view the assembled copies. These are approximate geometric illustrations, not a physical simulation of yarn, drape, stuffing, stitch topology or arbitrary asymmetric shaping. Missing gauge uses uncalibrated stitch units; when an assembled view contains any uncalibrated part, its amigurumi parts all use stitch units. Copy placement uses the existing translations/rotations. Joining notes can reference calibrated top/bottom rings; straight-edge automatic alignment and flat-piece folds do not apply to those rings. The main assembly preview also shows amigurumi surfaces. The focused working view navigates the full amigurumi rounds without silently changing completed-round counts.

Exports include editable amigurumi JSON bundles, written TXT instructions, directly downloaded A4 PDF, the 3D view or selected-round PNG, OBJ and binary STL. JSON bundles preserve part designs, quantities, poses and references; use full project JSON for the entire project and its assembly plan. PDF includes the first-round symbol diagram, full written round recipes and approximate part views; the round PNG control exports the currently selected diagram. The main document export also recognizes amigurumi pieces and its content selections. Mesh export follows the selected view scope and surface/stitch detail. Fully gauged exports use centimeter coordinates; other exports are labeled uncalibrated stitch units. STL is unitless and relies on the filename/documentation for scale. Meshes illustrate the design and are not certified printable objects.

Current bounds: 32 project pieces, quantities 1–99, 200 rounds and 20000 worked symbols per amigurumi part, up to 1000 produced stitches per round, four references per part, PDF references up to 1 MB, source text up to 200000 characters, and the existing 2 MB total project limit. Photos up to 10 MB/40 megapixels are compacted. The viewer limits surface vertices to 100000 and detailed loops to 30000; mesh exports allow 250000 vertices and up to 4000 detailed loops per part. Large designs can use the selected-part scope or surface detail. PDFs are capped at 50 pages. These limits never silently truncate rounds or meshes.

Amigurumi yarn consumption is not yet calibrated against representative measured rounds. The editor and reservation calculations reject flat-piece area estimates for these parts instead of presenting misleading yarn quantities. Real crochet measurements and amigurumi workflow acceptance remain outstanding.
