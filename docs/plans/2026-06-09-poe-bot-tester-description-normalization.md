# Description Normalization Plan

status: completed

## Context

Description scoring used the raw metadata description length. A whitespace-only
description could therefore look long enough to pass the clarity check even
though it contained no useful content.

## Objectives

- Trim `metadata.description` with `metadata.description.trim()` before
  description scoring.
- Keep the regular and streaming analyzers aligned.
- Add deterministic coverage for blank bot descriptions.
- Document the scoring guardrail in README, SECURITY, VISION, and CHANGES.

## Verification

- `npm test`
- `make check`
- `git diff --check`
