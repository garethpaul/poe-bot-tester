# Scripted Baseline Check

## Status

Completed

## Context

The repository has a full npm verification gate and a root `make check`
wrapper, but it did not have a scriptable repository baseline guard for package
script wiring, completed plan metadata, and local metadata hygiene.

## Objectives

- Keep `make check` as the root verification command.
- Add a script-level baseline guard for required repository files.
- Protect the package script wiring used by `npm run verify`.
- Keep local secrets and editor metadata out of the Next.js app repository.

## Work Completed

- Added `scripts/check-baseline.sh`.
- Wired the script into `make check` after the existing verify gate.
- Added `.idea/`, `.vscode/`, and `*.iml` ignore rules.
- Updated README, VISION, and CHANGES.

## Verification

- `scripts/check-baseline.sh`
- `npm test`
- `make check`
- `git diff --check`

## Follow-Up Candidates

- Add narrower baseline checks for new API routes as they gain regression
  coverage.
- Add CI for `make check` if this app becomes actively maintained.
