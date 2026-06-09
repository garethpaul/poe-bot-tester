# Chunked Session ID Validation

status: completed
date: 2026-06-09

## Context

The chunked analyzer accepts an optional `sessionId` so the UI can continue a
multi-step run. That value becomes an in-memory session key and is echoed in
SSE progress events, so it should be bounded and token-shaped before a stream
is opened.

## Changes

- Added `normalizeChunkSessionId` to validate optional chunked-analysis session
  IDs.
- Rejected invalid session IDs before opening a progress stream or touching the
  session map.
- Extended the deterministic route test and docs for the new validation
  contract.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run audit`
- `make check`
