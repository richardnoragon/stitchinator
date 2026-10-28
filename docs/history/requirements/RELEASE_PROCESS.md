# Release Process

Planning requirements; no releases or automated checks are claimed.

## Governing policy

Use [Standard Versioning Policy](../../../Versioning/Versioning%20%20Standard%20%20Policy.md). Apply semantic versioning with alpha, beta, and RC prereleases. Docker version tags are immutable (for example, `v0.1.0`); do not distribute through `latest`. Embed the commit SHA in artifact metadata.

Each release requires a changelog with applicable Added, Changed, Fixed, Deprecated, Removed, and Security entries linked to commits. Validate version changes in CI and block publication without a valid version bump. Ordered data migrations must include rollback paths. Apply the policy’s public API versioning and deprecation rules when applicable. Review the policy annually.

## Validation and approval

The owner handles technical checks. His girlfriend validates crochet workflows. The owner approves a release after both forms of validation.

Initial testing is limited to Kubuntu Linux. Windows and macOS remain intended host platforms, not verified platforms. Record the tested OS, architecture, Docker version, and browser for each release. Initial environment: Kubuntu 26.04 (interpreting “2604”), Firefox, and 32 GB RAM. CPU architecture, GPU, and exact Docker/browser versions remain open.

Validate relevant calculations, offline operation, local-only access, persistence, revision recovery, inventory accounting, exports, and backup/restore as described in TESTING.md. Release approval depends on completing agreed technical checks and crochet workflows, without a fixed trial duration. Feature-freeze and bug-severity gates remain open.

## Updates

Updates are initiated manually. Before an update changes stored data, create a full safety backup. Exact update failure handling, rollback commands, and distribution channel remain to be defined. Do not treat an older application image alone as a data rollback strategy.

## Packaging

Every version is distributed through Docker. Initial delivery supports both local builds from source and loading a supplied Docker image archive. A private registry is not required initially. Build/load instructions and artifact handoff remain to be specified.
