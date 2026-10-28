# Testing and acceptance

## Current evidence

The local source passed 38 JavaScript logic tests, 24 Rust tests, Rust formatting/Clippy and native offline builds. Full Chromium/Firefox workflows passed, plus focused snapping, shared picture library and amigurumi suites. Amigurumi tests use actual local OCR on selectable-text, scanned and mixed-page PDF/photo fixtures and check all seven export formats. Gallery/view screenshots and generated PDF pages were inspected.

These are synthetic technical fixtures. No real swatch/finished-piece acceptance, physical fabric accuracy or amigurumi yarn calibration is claimed. Existing alpha.20 image archives predate this Git repository. Updated Docker packaging includes OCR but still needs its own image validation and owner approval before distribution.

## Reproduce locally

The initially recorded toolchain is Rust/Cargo 1.98.1 and Node.js 22.22.1 on Linux. CI pins Rust 1.98.1 and Node.js 22. Docker uses its declared Rust builder separately. Browser setup may download browser binaries and system packages.

```sh
cargo fmt --all --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
npm ci
npm run test:logic
cargo build --locked
npx playwright install --with-deps chromium firefox
npm run test:browser
npm run test:browser -- --snapping-only
npm run test:browser -- --pictures-only
npm run test:browser -- --amigurumi-only
python3 scripts/check_repository.py
```

Install `poppler-utils`, `tesseract-ocr`, `tesseract-ocr-eng` and `tesseract-ocr-deu` for the OCR workflows on Debian/Ubuntu. Browser suites launch a server on loopback port 18089 and isolate their collection/backups in temporary directories. Keep that port free. Test downloads/screenshots are under `/tmp`; do not use personal projects as fixtures.

## Coverage

- Gauge, shape/band estimates, stock conservation, competing commitments, corrections and released reservations.
- Project migration, version conflicts, named revisions, failed saves, backup chains, interrupted restore and safety-backup failures.
- Custom images, repeat tiles, instruction review, PDF/PNG exports, library copies and optional photos.
- Snapping to segments/arcs/connection points, tangent orientation, bypasses and drag persistence.
- Amigurumi recipe expansion, import warnings, profiles, mesh topology/finite vertices, STL normals/layout, TXT round trips and high-resolution dense charts.
- An older queued save must not announce that newer project edits are saved.

## CI and release gates

The [workflow template](ci/ci.yml.example) is prepared to perform these technical checks and build a Docker image with OCR utilities. Per owner decision, it is not installed as an active GitHub Actions workflow because the current token lacks workflow permission. The initial import claims local test results, not GitHub CI results. See [activation instructions](CI_SETUP.md). A future passing workflow will not be a release or craft approval. Before distributing a new candidate, validate the image, real crafting workflows, backup/update/rollback behavior and the intended host platforms. Record actual tool/browser/Docker versions and identify the tested commit. Do not infer historical CI results from imported documentation.

Detailed pre-Git increment records are preserved in [history](history/requirements/TESTING.md).
