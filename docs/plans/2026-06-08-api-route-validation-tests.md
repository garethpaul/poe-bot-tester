# API Route Validation Tests

status: completed

## Status

Completed

## Context

The repository had deterministic scoring-helper tests, but the App Router
handlers still lacked coverage for request validation. That left the local test
gate unable to prove malformed `/api/analyze-bot` and `/api/test-bot` requests
fail before external Poe requests are attempted.

## Objectives

- Cover missing-field validation for `/api/analyze-bot`.
- Cover missing-field validation for `/api/test-bot`.
- Prove invalid route payloads do not call `fetch`.
- Cover malformed Poe bot names before route handlers build upstream URLs or
  model request payloads.
- Cover the successful `/api/test-bot` request shape with a mocked `fetch`.
- Keep the coverage inside the existing `npm test` command.

## Verification

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run audit`
- `npm run verify`
