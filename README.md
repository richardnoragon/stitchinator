# Stitchinator

Offline crochet, knitting and amigurumi design with a Rust backend and a local browser editor.

**Status:** internal prototype. The source includes the `0.1.0-alpha.20` baseline plus unreleased editor, picture-library and amigurumi work. It is not an approved complete release. Real craft acceptance, calibrated amigurumi yarn consumption, and Windows/macOS host verification remain outstanding.

**License:** undecided. This public repository does not provide an open-source license grant. See [license status](LICENSE.md).

## Features

- Rectangular and radial crochet charts, initial knitting support, custom symbols, reusable patterns, undo/redo and named revisions.
- Expanded stitch families, automatic guide/vertex snapping, symbol anchors and guide-relative orientation.
- A shared picture pattern library with chart previews, optional fabric photos, recipes and independent copies saved under unique new names.
- Multi-piece projects, quantities, per-copy progress, assembly placements, seam notes and controlled flat-piece folds.
- Measured-swatch flat-piece yarn estimates, shared yarn inventory, reservations, shortage reporting and consumption history.
- Full-round amigurumi editing, reviewed offline PDF/photo OCR, references, stuffed-form and procedural stitch-level views.
- Local JSON persistence, portable project files, collection backups/restore, PDF/PNG export and amigurumi TXT/OBJ/STL export.

3D views are approximate geometry. OCR works on written instructions and requires review. Unsupported notation is flagged; real-world pattern correctness is not inferred from passing software tests.

## Run with Docker

Install Docker Engine/Desktop and Docker Compose. On the current Linux setup:

```sh
python3 scripts/prepare_backups.py
docker compose up --build -d
```

Use the `STITCHINATOR_BACKUP_*` values printed by the script; save them in a local `.env` when they differ from the defaults in [.env.example](.env.example).

Open [Stitchinator](http://127.0.0.1:8080). The published port is restricted to loopback. First builds download dependencies; normal operation and local OCR work offline.

```sh
docker compose down
```

The named data volume persists projects. Do not remove it to update the app. The backup folder is separate from the volume; see [backup and restore instructions](docs/USER_GUIDE.md#collection-backups-and-restore). Linux backup permissions and host-timezone mounting require separate Windows/macOS verification.

## Native development

Use the Rust toolchain recorded in [testing](docs/TESTING.md), Node.js 22+, and Python 3 for helper scripts. Offline OCR needs Poppler and Tesseract with English/German language data on PATH.

```sh
cargo run --locked
```

If Docker already uses port 8080, choose another loopback address with `STITCHINATOR_BIND` and a disposable `STITCHINATOR_DATA` directory.

Native automatic backups require a prepared `STITCHINATOR_BACKUPS` directory outside `STITCHINATOR_DATA`. Do not use real personal data for development tests.

## Validation

```sh
cargo fmt --all --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
npm ci
npm run test:logic
cargo build --locked
npx playwright install --with-deps chromium firefox
npm run test:browser
```

Focused browser suites cover [snapping, picture patterns and amigurumi](docs/TESTING.md). OCR tests need the system OCR tools. A [CI workflow template](docs/ci/ci.yml.example) covers source quality, browser workflows and Docker packaging. It is intentionally inactive until workflow authorization is approved; see [CI setup](docs/CI_SETUP.md). Technical checks are separate from craft and release approval.

## Documentation and planning

- [Documentation index](docs/README.md)
- [User guide](docs/USER_GUIDE.md)
- [Architecture and storage](docs/ARCHITECTURE.md)
- [Testing and acceptance limits](docs/TESTING.md)
- [Roadmap](docs/ROADMAP.md) and [decisions](docs/DECISIONS.md)
- [Release process](docs/RELEASE_PROCESS.md)
- [Project board and Codex workspace](docs/PROJECTS.md)
- [Changelog](CHANGELOG.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md) and [license status](LICENSE.md)
- [Preserved pre-Git history](docs/history/README.md) and [original ideas](napkin.md)

Updates are manual. Back up the collection before changing versions and retain a matching image/data backup for rollback. Historical image archives are excluded from Git and are not GitHub releases.
