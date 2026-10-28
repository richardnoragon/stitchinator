# CI setup

The owner explicitly chose to publish source with a documented CI template for now. The GitHub token used for initialization has repository/project permissions but lacks the separate workflow permission required to publish GitHub Actions files. No active workflow or GitHub CI result is claimed.

The proposed [workflow](ci/ci.yml.example) runs on pushes to main, pull requests and manual dispatch. It uses read-only repository permissions, Rust 1.98.1, Node.js 22, local OCR tools, Chromium/Firefox and a Docker build. It does not publish releases or images. Action versions were checked against their upstream releases during preparation.

## Validate without CI

Run the commands in [TESTING.md](TESTING.md). They cover source hygiene, local Markdown links, locked versions, Rust/JavaScript checks, native browser suites and separate Docker packaging validation.

## Activate later

When the owner authorizes workflow publication, refresh the GitHub CLI authentication scope:

```sh
gh auth refresh --hostname github.com --scopes workflow
```

Move `docs/ci/ci.yml.example` to `.github/workflows/ci.yml`, update the repository documents to state that CI is active, and commit/push that change using the authorized credentials. Then inspect the first workflow run and correct any runner-specific failures. A successful CI run is technical evidence, not crafting acceptance or release approval.
