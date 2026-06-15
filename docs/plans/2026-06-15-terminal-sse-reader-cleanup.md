# Terminal SSE Reader Cleanup

Status: In Progress

## Problem

The chunked-analysis page returns immediately when a streamed `complete` event
arrives. If the server has not closed the response yet, the browser reader is
left with unread data and a held lock. Terminal UI state should stop network
consumption and release reader ownership without changing retry behavior for
real read failures.

## Requirements

1. Cancel the response reader when an update handler reports terminal
   completion before stream EOF.
2. Release the reader lock after terminal completion, normal EOF, callback
   failure, and reader failure.
3. Preserve buffered UTF-8/SSE decoding, update ordering, final-record flush,
   retry behavior, and next-chunk scheduling.
4. Add deterministic tests and mutation-sensitive package/static contracts for
   terminal cancellation and unconditional lock release.

## Scope Boundaries

- Do not change server routes, request payloads, retry counts, backoff timing,
  scoring, session storage, or SSE framing.
- Do not add dependencies or require live Poe credentials.
- Do not claim browser execution from Node stream-reader tests.
- Do not merge or close stacked pull requests without explicit authorization.

## Verification

- Pending focused stream-consumer tests and integration validation.
- Pending full repository and external-directory package gates.
- Pending hostile mutation, diff, artifact, and secret audits.
