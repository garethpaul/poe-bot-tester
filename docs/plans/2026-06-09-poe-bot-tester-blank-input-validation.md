# Poe Bot Tester Blank Input Validation

status: completed

## Context

The App Router handlers checked required `apiKey` and `prompt` values with
truthiness. Whitespace-only strings passed those checks, allowing analysis and
bot-test routes to attempt Poe requests with blank credentials or prompts.

## Objectives

- Add deterministic red tests for blank API keys and prompts.
- Share a `normalizeRequiredText` helper for route boundary validation.
- Reject blank API keys across JSON, chunked, and streaming analysis routes.
- Reject blank prompts in the bot-test route before the Poe request is built.
- Document the validation behavior for security review.

## Verification

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run audit`
- `make check`
- `git diff --check`
