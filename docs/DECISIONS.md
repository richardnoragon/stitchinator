# Decisions

Confirmed by the owner on 2026-10-26. Product direction, not implementation status.

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-001 | Application name: Stitchinator. | Use consistently in documentation. |
| ADR-002 | Private project initially for the owner's girlfriend. | License terms remain open. |
| ADR-003 | Crochet first; knitting later. | Initial workflows focus on crochet. |
| ADR-004 | Every version distributed through Docker for local computers. | Support Windows, Linux, and macOS hosts; packaging details remain open. |
| ADR-005 | Browser interface backed by Rust. | Frontend and storage choices remain open. |
| ADR-006 | Offline-only operation. | Internet is permitted for downloading Docker, the app, and updates; everyday use stays offline. |

## Additional confirmed decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-007 | Include the core crochet editor and Phase 2 sections 1–5 from napkin.md in the first release. | Includes project management, personal yarn database, calculations, and exports; cloud sync is excluded by offline-only operation. Detailed subfeature boundaries remain open. |
| ADR-008 | Include symbol charts, textured 2D shape previews, and finished-piece 3D previews. | Visualization fidelity and supported construction types need definition. |
| ADR-009 | Combine free drawing, dimensioned templates, and manual stitch editing. | Editing and generated representations need consistent behavior. |
| ADR-010 | Calculate stitch and row counts from design inputs including yarn, stitch type, and gauge; optionally generate bullet-style instructions. | Target dimensions and shaping behavior need clarification. |
| ADR-011 | Use US English for the interface and select crochet terminology per project. | US, UK, and German stitch terminology; US English prose. |
| ADR-012 | Start with manually entered personal yarn inventory; yarn quantity estimation is essential. | Built-in catalog deferred; estimation method and inputs remain open. |

## Deferred discussion

Return to a concrete scarf or bag acceptance example later at the owner's request. No example has been selected yet.

## Further decisions from requirements discussion

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-013 | Enter desired finished dimensions to calculate stitches and rows. | Define shaping rules and feasible-size rounding. |
| ADR-014 | Use measured swatches and yarn length/weight data for estimates, with configurable extra allowance and grams/meters plus skein counts. | Define estimation formulas and support for multiple yarns or stitches. |
| ADR-015 | Initial 3D preview shows overall shape, colors, and approximate stitch texture. | Realistic drape and individual-stitch rendering are not initial requirements. |
| ADR-016 | Support flat rows, joined rounds, spiral rounds, and assembled pieces. | Design models and testing must cover all four. |
| ADR-017 | Let users select export contents. | Instructions-only and picture-plus-yarn outputs are required combinations; initial formats are PDF and PNG. |

Preview updates are confirmed; Apply is required before committing changes to the underlying design. Terminology is confirmed as US, UK, or German stitch names and abbreviations; prose stays in US English.

## Confirmed interaction and storage decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-018 | US English prose with US, UK, or German stitch terminology per project. | Switching terminology must preserve stitch meaning. |
| ADR-019 | Immediate preview followed by Apply to commit changes. | Autosave must not silently apply proposed edits. |
| ADR-020 | PDF and PNG exports initially. | Other export formats are deferred. |
| ADR-021 | Multiple yarn colors/types and stitch patterns per piece; estimate each yarn separately. | Define allocation and swatch rules. |
| ADR-022 | Autosave, crash recovery, and portable project files. | Define persistence, backup, and recovery behavior. Earlier revision recovery is confirmed separately in ADR-025. |
| ADR-023 | Single-user, no-login access restricted to the Docker host computer. | Local access restriction must be enforced and tested. |
| ADR-024 | Metric units initially. | Imperial units are outside initial scope. |

## Project management decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-025 | Recoverable revisions have descriptive, searchable names, not dates alone. | Define naming, snapshot creation, and search behavior. |
| ADR-026 | Portable projects include charts, notes, photos, yarn details, swatches, and instructions. | Define archive format and import behavior without assuming shared inventory should be overwritten. |
| ADR-027 | Track owned, reserved, and consumed yarn and warn of shortages. | Define accounting and reservation rules. |
| ADR-028 | Accept proposed yarn metadata and add flat/width or round/diameter. | Define metric units and validation. |
| ADR-029 | Multiple swatches correspond to yarn/stitch combinations. | Estimates must use the appropriate measurements. |
| ADR-030 | Use rectangle, circle, oval, triangle, and bag-base-with-sides templates for initial testing. | Final release template coverage is still open. |
| ADR-031 | Manually track completed rows/rounds and stopping points per piece. | Define how design edits and revision restoration affect progress. |

## Revision and stock rules

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-032 | Explicit Save revision with descriptive name, separate from autosave. | Autosave does not create a cluttered list of named revisions. |
| ADR-033 | Restore into a new current design, retaining all revisions and initially retaining progress and consumption. | Explain that consumption reflects prior work and offer review/update; do not silently rewrite actual usage. |
| ADR-034 | Reserve yarn at Ready to make, warning of reservations by other projects. | Define conflict resolution and reservation recalculation. |
| ADR-035 | Record actual usage manually in grams, deduct stock, and reduce reservation. | Define correction, excess-use, and completion rules. |
| ADR-036 | Yarn dimensions in millimeters, including optional flat-yarn thickness. | Preserve dimensions in storage and portable files. |
| ADR-037 | Warn on edits affecting completed work and offer retain/reset progress per affected piece. | Design changes cannot silently invalidate recorded progress. |
| ADR-038 | Missing swatch measurements make the corresponding estimate unavailable. | Designing remains possible; no rough fallback estimate. |

## Lifecycle and backup decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-039 | Use Draft, Ready to make, In progress, Completed, On hold, and Abandoned statuses. | Define transition behavior. |
| ADR-040 | Allow Ready to make despite insufficient yarn, clearly showing shortage to purchase. | Separate physical stock, reservations, and unmet requirements. |
| ADR-041 | Show requirement changes and require approval before updating reservations. | Keep the changed design and display Reservation needs review until reconciled if the update is declined. |
| ADR-042 | Completion/abandonment releases reservations and preserves consumption; On hold retains reservations. | Avoid double releases and preserve accounting history. |
| ADR-043 | Allow editing/removing consumption entries, correcting stock/reservations and retaining a correction record. | Accounting updates must be consistent and respect current project status. |
| ADR-044 | Full collection backup on the first day of each calendar month, daily incrementals. | Keep three monthly cycles outside the container; catch up at startup, warn/retry on unavailable storage, and make a safety backup before restore. Preserve backup-chain dependencies. |

## Backup schedule revision and recovery decisions

ADR-044 schedule amended by the owner: full backups are due on the first day of each calendar month, replacing the previous rolling 30-day interval. Incremental backups remain daily.

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-045 | Store backups in a user-selected host folder or external drive outside the container. | Configure host access and verify destination availability. |
| ADR-046 | Retain three monthly full-backup cycles with their daily incrementals. | Retention must preserve complete restore chains; duration varies with calendar months. |
| ADR-047 | Run overdue backups at the next application startup. | Capture current state, not fictional historical restore points for missed days. |
| ADR-048 | Warn persistently and retry when backup storage is unavailable; normal work continues. | Track failed/delayed backups visibly. |
| ADR-049 | Restore a date/time-selected point after creating a safety backup of the current collection. | Stop restoration if the safety backup fails. |
| ADR-050 | Declining a reservation update keeps the design change and shows Reservation needs review. | Clear the flag only when the reservation is reconciled. |

## Backup execution and release decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-051 | Run scheduled backups at the first opportunity each day while running, using the computer's local timezone. | On the first of the month a full replaces the daily incremental; overdue backups run at startup. |
| ADR-052 | Create an initial full backup when the destination is configured. | Incrementals require a valid full baseline. |
| ADR-053 | Stop restoration if the pre-restore safety backup fails. | Resolve the backup problem before replacing the collection. |
| ADR-054 | Owner performs technical checks and approves releases after girlfriend validates crochet workflows. | Record both validation results. |
| ADR-055 | Existing Standard Versioning Policy governs Stitchinator. | Semantic versions, prerelease stages, immutable Docker tags, traceable changelogs, and migration requirements apply. |
| ADR-056 | Updates are manual; data-changing updates require a full safety backup. | Define update failure and rollback behavior. |
| ADR-057 | Initially test only on Kubuntu Linux. | Windows/macOS remain targets without verification claims; exact test environment remains open. |

## Editor and initial delivery decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-058 | Initial testing uses Kubuntu 26.04, Firefox, and 32 GB RAM. | “2604” is interpreted as 26.04; exact browser/Docker versions and CPU/GPU remain open. |
| ADR-059 | Include common stitches, increases/decreases, clusters, shells, chains/spaces, custom stitches, and reusable combinations. | Define custom-stitch semantics and validation. |
| ADR-060 | Support rectangular and radial charts with manual symbol positioning. | Separate visual layout from stitch connectivity consistently. |
| ADR-061 | Settings dialog can enable/disable shaping suggestions; manual placement stays available. | Setting scope/default and proposal interaction remain open. |
| ADR-062 | Row/round instruction bullets include stitch totals and repeats and remain editable. | Define behavior when design changes require regeneration. |
| ADR-063 | Defer existing-pattern import discussion. | No import formats are committed by this decision; portable Stitchinator project files remain required. |
| ADR-064 | Deliver via local Docker builds from source and supplied Docker image archives. | Document both workflows; no initial private registry requirement. |

## Editor behavior decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-065 | Shaping suggestions default to enabled and are configured per project. | Preview proposals and require Apply; retain manual placement. |
| ADR-066 | Preserve edited instructions after design changes, flag affected text, and display regenerated text alongside. | Reconciliation must not silently overwrite user text. |
| ADR-067 | Custom stitches include name, abbreviation, symbol, consumed count, and produced count. | Corresponding measured swatches remain necessary for yarn estimates. |
| ADR-068 | Named selected stitch groups can be reused across projects. | Define whether subsequent library edits affect existing uses. |
| ADR-069 | Warn about mismatched counts/incomplete rounds while allowing editing; warn before exporting unresolved instructions. | Define checks for supported stitch and construction types. |
| ADR-070 | Initial test hardware is a Framework laptop with i5-1240P and 32 GB RAM. | Graphics configuration and measurable performance targets remain open. |

## Organization and implementation planning

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-071 | Existing projects retain copies of library stitches/combinations and offer explicit updates. | Library edits cannot silently alter existing designs. |
| ADR-072 | Projects and reusable combinations support names, descriptions, tags, search, and folders initially. | Include organization in storage, UI, and portable-file design. |
| ADR-073 | Owner is the sole initial developer; girlfriend tests crochet workflows. | Tailor contribution and approval processes to this private team. |
| ADR-074 | Release readiness depends on agreed checks and workflows, not a fixed trial duration. | Record validation results before owner approval. |
| ADR-075 | Build an internal prototype with one rectangular piece, chart editing, swatch-based yarn estimation, and basic 3D preview. | Intermediate milestone preserves the full first-release scope. |

License terms and copyright ownership are deferred by the owner. The development workflow in CONTRIBUTING.md is a proposal awaiting explicit approval, not an accepted decision.

## Prototype and organization refinements

The owner's “yes to one, two and three” is interpreted as acceptance of the three requirements questions following the workflow proposal. Workflow approval remains open pending clarification.

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-076 | Use a rectangular scarf with one yarn and one stitch pattern as the prototype example. | Actual dimensions and measured swatch data will be provided later. |
| ADR-077 | Library-definition updates use preview and Apply and flag affected instructions and yarn reservations. | Reuse established review and reconciliation behavior. |
| ADR-078 | Support nested folders, with one folder per project or reusable combination, plus tags. | Define move/deletion behavior without duplicating underlying items. |

## Explicitly deferred questions

The owner deferred the following three questions; no defaults or approvals should be inferred:

- Approval of the proposed development workflow in CONTRIBUTING.md. It remains proposed and unapproved.
- Behavior when gauge or stitch repeats prevent exact requested dimensions, including nearest-achievable-size calculation and approval.
- Trash/recovery behavior for deleted projects and reusable combinations, and rules for deleting folders with contents.

Return to these questions in a later requirements round. Previously confirmed requirements remain unchanged.

## Clarifications confirmed on 2026-10-27

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-079 | Projects contain multiple pieces with quantities included in yarn estimates. | Define progress for repeated copies. |
| ADR-080 | Add user-written finishing and assembly instructions alongside generated instructions. | Preserve user text through regeneration. |
| ADR-081 | Swatches record hook size and pre-/post-blocking measurement state. | Define which measurements drive calculations. |
| ADR-082 | Track dye lots separately and warn about mixing them. | Inventory allocation must preserve lot identity. |
| ADR-083 | Provide a focused working view with enlarged chart, highlighted row/round, and forward/back controls. | Define whether navigation changes recorded completion. |
| ADR-084 | Include custom stitches and stitch patterns initially; reject the proposed single-built-in-stitch prototype limit. | Expand prototype scope while retaining the rectangular scarf as a baseline example. |
| ADR-085 | Duplicate project imports offer Open existing or Import as a separate copy without automatic overwrite. | Define identity detection and treatment of imported inventory references. |

The previously deferred workflow approval, exact-size rounding, and Trash/folder deletion decisions remain deferred.

## Progress and yarn refinements confirmed on 2026-10-27

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-086 | Repeated piece copies share a design with separate progress. | Preserve copy identity in tracking and recovery. |
| ADR-087 | Next row/round completes the current one; backward navigation leaves completion unchanged. | Provide a separate action to undo completion. |
| ADR-088 | Default to post-blocking gauge for finished dimensions when both measurements exist. | Retain pre-blocking measurements for reference. |
| ADR-089 | Associate hook size with each yarn/stitch swatch combination; allow multiple hooks per project. | Include hook size when selecting applicable gauge data. |
| ADR-090 | Prefer one sufficient dye lot; ask the user to choose lots when mixing is necessary. | Allocation must respect available stock and reservations. |
| ADR-091 | Imported yarn stays reference-only until explicitly linked to local stock. | Project import cannot automatically increase owned inventory. |
| ADR-092 | Create reusable stitch patterns visually by arranging stitches and marking repeats. | Include visual pattern editing in initial scope. |

## Calculation and symbol decisions confirmed on 2026-10-27

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-093 | Allow pre-blocking-only gauge with a visible Before blocking label. | Missing post-blocking data does not prevent calculations when otherwise sufficient measurements exist. |
| ADR-094 | Swatch weight excludes leftover yarn and measures the sampled crochet fabric alone. | Provide input guidance. |
| ADR-095 | Default yarn allowance to 10%, configurable per project. | Treat as a testing starting point, not a validated sufficiency guarantee. |
| ADR-096 | Track remaining stock in grams, allowing partial skeins; derive meters and skein equivalents. | Define numerical precision and distinguish fractional equivalents from whole skeins to purchase. |
| ADR-097 | Support custom-symbol drawing, existing-symbol selection, and SVG/PNG import initially. | Include safe asset handling and portable-file support. |

Real prototype measurements requested in the latest round are explicitly deferred. Previously deferred decisions remain deferred. Synthetic data must be labeled if used; it does not replace real-world validation.

## Usability decisions confirmed on 2026-10-27

| ID | Decision | Consequence |
| --- | --- | --- |
| ADR-098 | Include keyboard navigation, adjustable interface text size, and chart zoom initially. | Validate accessible controls and usable layouts at enlarged sizes. |
| ADR-099 | Remember export-content selections per project and preview before saving. | Persist preferences and keep preview consistent with PDF/PNG output. |
| ADR-100 | Home screen shows last successful backup, overdue/failed status, and Back up now. | Keep backup status visible and allow user-initiated backup. |

Earlier decision entries retain the context in which they were made; later decisions resolve or refine their open questions. Explicitly deferred items remain deferred.

## Expanded workflows — alpha.20

The owner explicitly expanded the task to include later knitting and built-in catalog work. They selected a curated offline starter catalog and confirmed the first knitting scope: flat/circular charts, knit/purl and shaping stitches, gauge-based estimates, and existing project/assembly workflows. Earlier knitting/catalog deferrals are superseded by this authorization. Explicitly deferred rounding, deletion, licensing/workflow decisions and real acceptance measurements remain deferred.

## Shared visual pattern library — 2026-10-28

The owner confirmed a shared library with starter patterns and user-created patterns. Each entry presents a symbol chart and optional photo, stitches used, description and crochet instructions. Users can edit the chart, description and instructions, but saving must create an independent copy with a unique new name. Saved originals remain unchanged. The initial implementation uses rectangular crochet samples, independent project imports and collection backup coverage.

## Amigurumi scope — 2026-10-28

The owner selected every proposed import, viewing and export option. Add editable full-round amigurumi parts, offline reviewed conversion from written PDF/photo patterns, retained PDF/photo references, assembled stuffed-shape and stitch-level geometry views, and editable/printable/image/text/3D exports. OCR output and construction counts require explicit preview/review before Apply. Procedural geometry illustrates the pattern and does not claim physical fabric simulation. Preserve existing projects and use their revision, backup, quantity and progress mechanisms.

## Public GitHub repository — 2026-10-28

The owner authorized publishing the source to the public `richardnoragon/stitchinator` GitHub repository and creating both a linked GitHub Projects board and a Codex sidebar project. Licensing remains undecided, with no open-source permissions granted. The existing local Codex project is reused rather than duplicated. The initial Git commit imports the complete current source and documentation without claiming historical commits or an approved release.

## CI authorization — 2026-10-28

The current GitHub token permits repository/project operations but not workflow publication. The owner chose to publish the code with a documented CI template for now. Active GitHub Actions configuration and workflow-scope authorization are deferred. Local validation remains available.
