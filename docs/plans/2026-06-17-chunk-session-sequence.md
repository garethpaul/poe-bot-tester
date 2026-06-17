# Exact Chunk Session Sequence

status: completed

## Problem

Chunk sessions serialize overlapping requests and bind a session to one bot,
but they do not track which chunk is expected next. A caller can start a new
session at the final chunk, replay a completed chunk, or skip ahead, producing
incomplete scores or duplicate category results without an explicit error.

## Prioritized Requirements

- P0. Require every new chunk session to begin at chunk 0.
- P0. Require each existing session to receive exactly its next unfinished
  chunk and reject replays or skipped chunks with deterministic HTTP 409.
- P0. Ensure rejected sequence requests do not create, advance, delete, lease,
  or otherwise poison the session.
- P1. Preserve bot binding, overlap rejection, exact lease release, failure
  cleanup, scoring, request validation, and SSE framing.
- P1. Add mutation-sensitive behavioral/static tests, synchronized guidance,
  and completed verification evidence.

## Implementation Units

### U1. Expected chunk state

**File:** `src/app/api/analyze-bot-chunked/route.ts`

Track the next expected chunk in each session. Validate the requested chunk
before acquiring a request lease, and advance the sequence only after a chunk
successfully finishes. Delete a newly created session when its first request is
not chunk 0.

### U2. Sequence regressions

**File:** `scripts/test-analyze-bot.ts`

Cover nonzero session starts, completed-chunk replay, skipped chunks, and a
valid continuation after each rejection. Prove rejected requests perform no Poe
fetch and do not block the expected request.

### U3. Contracts and guidance

**Files:** `scripts/check-baseline.sh`, `README.md`, `SECURITY.md`, `VISION.md`,
`CHANGES.md`, `docs/plans/2026-06-17-chunk-session-sequence.md`

Protect expected-chunk state, validation ordering, advancement, regression
coverage, guidance, and completed plan evidence against hostile mutations.

## Validation

- Run focused route/static coverage, the complete deterministic suite, lint,
  typecheck, production build, audit, every Make alias, and the absolute
  Makefile gate from an external directory on Node 20 and Node 24.
- Reject isolated mutations of initial order, continuation order, validation
  placement, advancement, behavioral coverage, guidance, and plan status.
- Audit the exact stacked diff, generated build/dependency artifacts, secrets,
  conflict markers, modes, binaries, large files, and whitespace.

## Scope Boundaries

- Do not add persistence, distributed coordination, expiry, authentication,
  retries, or client-side scheduling changes.
- Do not cache/replay completed SSE responses or change score/test contents.
- Do not change session ID, chunk index, bot binding, or concurrency errors.
- Do not merge or close PR #11 or any predecessor.

## Risks

- A client that loses a completed chunk response must restart rather than
  replaying that chunk; response replay requires a separate persistence design.
- In-memory sessions remain process-local and non-durable by design.
- This change is stacked on PR #11, which must remain open and merge first.

## Work Completed

- Added per-session expected-chunk state initialized at chunk 0 and advanced
  only after a successful nonterminal chunk.
- Preserved the established overlap error before sequence validation, then
  reject replayed, skipped, or late-start chunks before acquiring a new lease.
- Delete an empty session created by an invalid nonzero start so a later valid
  chunk 0 can reuse the ID without state poisoning.
- Added behavioral and static contracts for invalid starts, replay, skip,
  non-poisoning continuation, cleanup reuse, and exact validation ordering.

## Verification Completed

- The focused route/static coverage and complete deterministic suite passed on
  Node 20.19.5 and Node 24.16.0.
- `npm run verify` passed lint, typecheck, tests, the Next.js 16.2.9 production
  build, and a zero-vulnerability audit on both runtimes.
- Every Make alias and the absolute Makefile gate from an external working directory
  passed on both supported Node lanes.
- Seven isolated hostile mutations were rejected: initial order, continuation
  comparison, validation placement, sequence advancement, behavioral
  invocation, guidance, and completed plan status.
- `git diff --check` plus generated build/dependency artifact, credential,
  conflict-marker, binary, size, mode, and intended-path audits passed.
- No live Poe request or real credential was used.
