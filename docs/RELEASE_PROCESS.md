# Release process

The initial repository import is a source snapshot, not an approved release. The package version remains `0.1.0-alpha.20` with unreleased changes recorded in the [changelog](../CHANGELOG.md). Do not reuse a distributed tag for this newer source.

## Candidate preparation

1. Resolve the intended scope, update the package/lockfile/Compose versions and changelog, and identify the exact source commit.
2. Complete [technical checks](TESTING.md) and record CI evidence. Verify the Docker build and OCR dependencies, offline behavior, local-only access, storage, exports and backup recovery.
3. Validate real crochet/knitting/amigurumi workflows and measured swatches. The owner performs technical checks; his crafting reviewer validates workflows; the owner approves distribution. A passing synthetic suite does not substitute for this approval.
4. Record tested host OS/architecture, Docker/browser versions and known limits. Windows/macOS have not yet been verified.
5. Create an immutable approved version tag and attach artifacts/checksums to that version. Link changelog entries to actual commits or pull requests. Initial pre-Git work has no individual historical commit references.

## Build provenance and delivery

Docker images accept a source reference:

```sh
docker compose build --build-arg VCS_REF="$(git rev-parse HEAD)"
```

After approval, tag an image with the chosen immutable version and export it with `docker save`. Provide the matching Compose file, backup preparation script, checksum and source reference. A local `unknown` build reference is not verified commit provenance. No workflow in this repository automatically publishes an image or creates a release.

## Updates and rollback

Create a full collection safety backup before an update changes stored data. Preserve the old immutable image, its Compose configuration and a matching pre-upgrade collection backup. Stop the app before replacing/restoring its data externally. Rollback requires a compatible application **and** its matching data; an older image alone is not a data rollback.

The app supports staged collection restore with safety backups, checksums and startup recovery. Validate migration/rollback paths with disposable data before distribution. Never remove the live named data volume as part of a normal update. Refresh older browser tabs after preserving unsaved edits.

## Policy

The existing [versioning policy](../Versioning/Versioning%20%20Standard%20%20Policy.md) governs versioned distribution. Licensing, broader development workflow approval and some release gates remain owner decisions. The current source checks and inactive CI template do not claim all policy enforcement has been automated. CI activation is deferred as recorded in [CI setup](CI_SETUP.md).
