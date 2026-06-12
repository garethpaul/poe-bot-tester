# Poe Metadata Fetch Timeout

status: completed

## Context

The chunked analyzer bounds Poe bot-page metadata requests to five seconds, but
the non-streaming and streaming analyzers issue the same external request
without an abort signal. A stalled Poe page can therefore hold those API
routes open indefinitely and prevent their analysis from reaching an ordinary
failed-metadata result.

The three analyzers should share one explicit metadata request boundary so
future changes cannot silently drift by route.

## Priority

Every analysis mode fetches untrusted external network content before or during
scoring. Consistent timeout behavior limits resource consumption and makes
failure behavior predictable across route variants.

## Prioritized Engineering Backlog

1. Apply one shared five-second metadata fetch timeout to all analyzers now.
2. Replace the non-streaming analyzer's hardcoded localhost fixture request
   with a deployment-safe same-origin or shared-fixture implementation.
3. Add request-level cancellation propagation if Next route cancellation APIs
   become part of the supported runtime contract.

## Requirements

- R1. Non-streaming, streaming, and chunked Poe metadata fetches must all use
  the same five-second timeout constant.
- R2. Timeout failures must continue through existing metadata fallback/error
  handling without exposing API keys or transport details to users.
- R3. Poe completion request timeouts and retry behavior must remain unchanged.
- R4. Bot-name normalization and URL construction must remain unchanged.
- R5. Tests and static contracts must fail if any analyzer metadata fetch loses
  its abort signal or uses a route-local timeout literal.
- R6. README, security guidance, vision, and change history must document the
  shared network boundary.

## Implementation Units

### U1. Centralize the metadata timeout

- **Files:** `src/app/api/analyze-bot/scoring.ts`
- Export `POE_METADATA_TIMEOUT_MS` with the existing five-second value.

### U2. Apply it across analyzer variants

- **Files:** `src/app/api/analyze-bot/route.ts`,
  `src/app/api/analyze-bot-stream/bot-analyzer.ts`,
  `src/app/api/analyze-bot-chunked/route.ts`
- Import the shared constant and pass `AbortSignal.timeout(...)` to each Poe
  bot-page metadata fetch.

### U3. Add regression contracts and docs

- **Files:** `scripts/test-analyze-bot.ts`, `scripts/check-baseline.sh`,
  `README.md`, `SECURITY.md`, `VISION.md`, `CHANGES.md`
- Verify all analyzer source paths use the shared signal and record the
  reliability boundary.

## Scope Boundaries

- Do not change completion API timeouts, retry counts, or scoring.
- Do not change the hardcoded fixture URL in this focused change.
- Do not change user-facing metadata failure scores or messages.
- Do not add dependencies.

## Verification

- `npm run verify`
- `make check`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
- `git diff --check`
- Mutations removing any metadata abort signal or reintroducing a route-local
  `5000` timeout must fail the regression suite.

Completed on 2026-06-12 with one shared timeout constant, coverage for all
three analyzer variants, baseline contracts, and maintenance documentation.
