# Contributing

Stitchinator is an early personal project with a public source repository and undecided licensing. Read [license status](LICENSE.md) before reusing code or proposing contributions. External contribution/copyright terms and the broader development workflow have not yet been adopted; discuss substantial changes with the maintainer first.

## Development

See the [architecture](docs/ARCHITECTURE.md), [user guide](docs/USER_GUIDE.md), [testing commands](docs/TESTING.md) and [roadmap](docs/ROADMAP.md). Use disposable local data, keep runtime files out of source control, and preserve preview-versus-Apply semantics, edited instructions, operational history and version checks.

For a focused change, explain its concrete behavior, update affected documentation, and run appropriate checks. Use conventional commit descriptions such as `feat:`, `fix:` or `docs:` where helpful. Branch protection and a mandatory pull-request workflow remain owner decisions; their absence is not release approval.

## Review

Describe the problem, resulting behavior, relevant validation and remaining limits. Use synthetic/minimal reproductions without personal project files, photos, backups or credentials. Do not claim physical craft accuracy from software fixtures. Real craft acceptance and distribution approval follow the [release process](docs/RELEASE_PROCESS.md).

The npm package is marked private to prevent accidental registry publishing; the GitHub repository itself is public.
