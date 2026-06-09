# Poe Bot Tester Check Wrapper

## Status

Completed

## Context

The Next.js bot tester already exposes `npm run verify` as the complete local
gate, but repository automation expects a root `make check` command.

## Objectives

- Add a root Makefile with lint, typecheck, test, build, audit, verify, and
  check targets.
- Make `make check` run the same complete gate as `npm run verify`.
- Preserve wrapper documentation through the deterministic helper test.
- Update README and CHANGES with the new command.

## Verification

- `make check`
- `npm run verify`
- `git diff --check`
