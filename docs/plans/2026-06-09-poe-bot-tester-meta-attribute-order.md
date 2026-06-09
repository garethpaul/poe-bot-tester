# Poe Bot Tester Meta Attribute Order Plan

status: completed

## Context

`parseBotPage` extracted Poe description and profile image metadata with regular
expressions that expected `name` or `property` to appear before `content`.
HTML meta attributes can be reordered, so valid bot pages could lose
description and profile image data.

## Objectives

- Add deterministic test coverage for reversed `content` and `name`/`property`
  meta attributes.
- Add `findAttribute` and `findMetaContent` helpers for order-independent Poe
  metadata parsing.
- Match exact meta attribute names without accepting prefixed attributes such
  as `data-name` or `data-property`.
- Preserve existing title, verification, follower, and fallback profile image
  parsing behavior.
- Document the metadata parsing guardrail in README, security notes, and vision.

## Verification

- `npm test`
- `make lint`
- `make test`
- `make build`
- `make check`
- `git diff --check`
