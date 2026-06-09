# Deterministic Stream Scores

status: completed

## Context

The streaming analyzer contained placeholder checks that used `Math.random()` to
decide pass/fail status and scores. That made repeated runs produce different
scorecards even when inputs had not changed.

## Goals

- Remove random scoring from the streaming analyzer.
- Mark simulated live Poe checks as deterministic `pending` results until the
  live checks are implemented.
- Keep fixture-backed file checks deterministic.
- Extend the local test script so `Math.random()` does not return to the
  streaming analyzer.
- Document deterministic streaming analyzer scoring in README, SECURITY,
  VISION, and CHANGES.

## Verification

- `npm test`
- `npm run verify`
- `make check`
- `git diff --check`
