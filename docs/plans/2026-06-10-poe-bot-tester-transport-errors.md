# Poe Bot Transport Errors

status: completed

## Context

The `/api/test-bot` route returned raw fetch exception messages to callers and
used `408` for an upstream Poe timeout. Runtime messages can expose internal
network details, while `408` incorrectly attributes an upstream deadline to the
client request.

## Objectives

- Keep the existing 30-second outbound request signal.
- Return a stable `504` for timeout and abort errors.
- Return a stable `502` for other Poe transport errors.
- Log stable messages without raw runtime exception details.
- Preserve deliberate Poe HTTP response handling.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run audit`
- `make check`
- Mutation: return raw `error.message` and confirm the transport test fails.
- Mutation: restore timeout status `408` and confirm the transport test fails.
- `git diff --check`
