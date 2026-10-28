# Contributing and Development Workflow

## Confirmed team

This is a private project. The owner is the sole initial developer. His girlfriend validates crochet workflows; the owner performs technical checks and approves releases. External contributions are not currently part of the plan.

## Proposed workflow — approval deferred by owner

The workflow below is proposed, not adopted. Release versioning requirements already confirmed in RELEASE_PROCESS.md remain binding.

1. Keep `main` in a working state. Use short-lived `feat/`, `fix/`, and `docs/` branches for focused changes.
2. Define a small task and acceptance criteria before implementation. Start with the approved rectangular-piece prototype. Record significant accepted design choices in DECISIONS.md.
3. Make focused commits using `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:` prefixes and a concise description. Commit prefixes do not alone determine the release version.
4. Follow standard Rust formatting and Clippy checks. Select frontend formatting/type checks once its technology is chosen. Prefer clear module boundaries and handle errors explicitly; do not introduce architectural frameworks without a concrete need.
5. Validate changes proportionately: calculation/accounting tests for numerical or state changes; integration tests for persistence, migrations, backup, and restore; browser/manual checks for affected user workflows. Documentation-only changes need content/link review, not a full application test suite. Use disposable test data.
6. Review the diff and relevant checks before merging. The owner may self-review; a second developer or hosted pull request is not required. Obtain girlfriend feedback for meaningful crochet workflow changes before calling them validated.
7. Merge the focused branch into `main` once checks pass, update relevant documentation, and remove the completed branch. Preserve commit references needed for release changelogs.
8. Prepare a release using the agreed versioning policy and RELEASE_PROCESS.md. Verify the source-build and image-archive delivery paths. Release only after technical checks, crochet workflow validation, and owner approval; no fixed trial period applies.

## Still to define

Repository hosting, CI provider, frontend tooling, exact commands, test fixtures, and detailed prototype acceptance criteria. Do not describe checks as automated until the implementation exists.
