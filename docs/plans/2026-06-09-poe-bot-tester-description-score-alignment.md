# Poe Bot Tester Description Score Alignment

status: completed

## Context

Description analysis treated `parameter` and `cannot` wording as passing
evidence, but only `--` and `limitation` wording received full passing scores.
That could make a result report `passed` while still carrying a marginal score.

## Goals

- Align the exported analyzer helper so passing parameter evidence scores 90.
- Align the exported analyzer helper so passing `cannot` limitation evidence
  scores 85.
- Keep the streaming analyzer copy aligned with the same scoring rule.
- Add deterministic regression coverage and docs for description scoring.

## Verification

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `make check`
- `git diff --check`
