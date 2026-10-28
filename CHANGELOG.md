# Changelog

## Unreleased

### Added

- Public GitHub source repository, project board, current documentation, source hygiene checks and a documented CI workflow template. CI activation is deferred pending workflow authorization.
- Expanded crochet presets, guide/vertex snapping, top/center/bottom anchors, independent rotation and tangent-relative orientation.
- Shared picture pattern library with chart images, optional photos, editable recipes and server-enforced save-as-new naming.
- Full-round amigurumi workspace, reviewed local PDF/photo OCR, references, approximate surface/stitch geometry, assembly and JSON/TXT/PDF/PNG/OBJ/STL exports.
- Poppler/Tesseract dependencies in Docker source packaging and source-reference image metadata.

### Fixed

- An older queued save no longer reports newer unsaved changes as saved.
- Snapping drag previews no longer shift the chart's coordinate origin.
- Mixed selectable/scanned PDF pages are retained during extraction; unknown round syntax is flagged.
- Amigurumi geometry uses depth buffering for foreground yarn visibility and does not substitute flat-area yarn estimates.

### Documentation and provenance

The initial Git commit imports the existing implementation, including the `0.1.0-alpha.20` baseline and later unreleased work. No earlier Git commits, approved releases or artifact provenance are invented. Historical increment notes are retained under [docs/history](docs/history/README.md). Future entries should link to the actual commits/pull requests that implement them.
