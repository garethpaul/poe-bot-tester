# CI Baseline

status: completed

## Context

The repository had a local npm-backed `make check` verification gate, but no
hosted workflow installed dependencies and ran it for pushes and pull requests.

## Changes

- Added a pinned, read-only GitHub Actions matrix that installs Node 20 and
  Node 24 dependencies with `npm ci` and runs `make check`.
- Disabled checkout credential persistence, kept Poe credentials empty, added
  CODEOWNERS, and enforced the sole hosted workflow contract.
- Extended the scripted baseline and docs so the hosted CI path stays covered.

## Verification

- `make check`
- Node 20 and Node 24 full gate execution
- six hostile workflow and ownership mutations
- workflow YAML parse
- `git diff --check`
