# Poe Bot Name Validation

## Status

Completed

## Context

App Router handlers accept a `botName` field and use it to build Poe profile
URLs and Poe-compatible model request payloads. The routes already checked for
missing names, but malformed names with paths, query strings, or full URLs were
not rejected before any upstream call.

## Work Completed

- Added a shared `normalizePoeBotName` helper for API routes.
- Applied the helper to standard, chunked, streaming, and test-bot routes.
- Extended deterministic route tests to prove malformed names return `400` from
  standard, chunked, streaming, and test-bot routes without calling `fetch`.

## Verification

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run audit`
- `npm run verify`
