# Security

Stitchinator is a local, single-user prototype with no login. The Compose configuration publishes only `127.0.0.1:8080`; do not expose it to an untrusted network. The Rust server checks local Host/Origin values and requires application headers on protected writes. These controls are not a substitute for authentication on a public service.

Runtime assets and OCR are local. Internet is used for initial dependencies, image builds and manual updates. The container runs as an unprivileged user. PDF/photo extraction uses bounded temporary files, fixed tool arguments and page/time limits; imported text still requires human review. Keep system OCR tools and images updated.

Projects, photos, yarn inventory, usage history, embedded references and backups can contain personal data. Runtime storage and backups are excluded from Git. Backups are unencrypted and depend on host-folder permissions. Autosave is not an external backup; preserve collection backup chains and verify restores.

This is a prototype without a formal supported-version or response-time commitment. Report suspected vulnerabilities privately to the repository owner through an agreed private channel. Use GitHub private vulnerability reporting if enabled; avoid posting sensitive exploit details or personal data in public issues. Do not send credentials or private collection files.

See [architecture](docs/ARCHITECTURE.md), [operations](docs/USER_GUIDE.md) and [release procedure](docs/RELEASE_PROCESS.md) for actual behavior and limitations.
