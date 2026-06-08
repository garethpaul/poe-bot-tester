# Analyze Bot Helper Regression Tests

## Status

Completed

## Context

`poe-bot-tester` had a healthy lint/type/build/audit gate, but no deterministic
test command. The `analyze-bot` route contains pure parsing and scoring helpers
that can be exercised without live Poe access or a browser runtime.

## Objectives

- Add a fast `npm test` command that does not call external services.
- Cover Poe profile HTML parsing for display name, description, image, verified
  state, and follower count.
- Lock in representative bot-name and description scoring outcomes.
- Include the test command in the repo-level `npm run verify` gate.

## Verification

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run audit`
- `npm run verify`

## Follow-Up Candidates

- Add score aggregation tests for full `BotScorecard` output.
- Share parsing/scoring helpers with the chunked and streaming analyzers to
  reduce duplicated logic.
