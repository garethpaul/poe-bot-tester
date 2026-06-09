# Chunk Index Validation

status: completed

## Context

The chunked analyzer accepts a caller-provided `chunk` value to continue a
multi-step analysis session. Out-of-range or malformed chunk values could miss
the chunk table and return an empty 200 SSE response instead of a clear client
error.

## Goals

- Add a `normalizeChunkIndex` guard for the chunked analyzer route.
- Reject non-integer, negative, and out-of-range chunk indexes before creating
  progress streams.
- Keep invalid chunk requests from reaching upstream Poe fetches.
- Document the chunk index validation contract in README, SECURITY, VISION,
  and CHANGES.

## Verification

- `npm test`
- `npm run verify`
- `make check`
- `git diff --check`

Expected invalid chunk response:

`Chunk must be an integer between 0 and 6`
