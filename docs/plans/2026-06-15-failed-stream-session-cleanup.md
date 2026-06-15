# Failed Stream Session Cleanup

Status: Planned

## Problem

The final chunk removes its completed in-memory session, but an unexpected
`processChunk` failure emits an SSE error without releasing the session ID.
That stale entry remains bound to its original bot and can reject later reuse
for a different bot even though the stream has terminated.

## Requirements

1. Delete the exact acquired session before attempting to emit a terminal SSE
   error.
2. Preserve active multi-chunk continuation, successful final cleanup,
   same-bot reuse, and cross-bot conflict handling while a session is active.
3. Add deterministic route-level coverage proving a failed stream releases its
   session ID for another bot.
4. Add mutation-sensitive static contracts, synchronized guidance, and truthful
   completed verification evidence.

## Scope Boundaries

- Do not add persistence, expiry, authentication, dependencies, or automatic
  retries.
- Do not change chunk scheduling, score calculation, Poe requests, SSE framing,
  or normal continuation behavior.
- Do not require live Poe credentials, network access, or browser execution.
- Keep this change stacked on PR #8; do not merge or close either pull request
  without explicit owner authorization.

## Verification Plan

- Run focused route coverage and the complete deterministic test suite on Node
  20 and Node 24.
- Run lint, typecheck, production build, dependency audit, repository
  `make check`, and the absolute-Makefile gate from an external directory.
- Reject isolated mutations of cleanup ordering, session identity, runtime
  coverage, guidance, and plan status.
- Audit the exact diff, generated artifacts, dependencies, credentials,
  conflicts, modes, binaries, and whitespace before commit and push.
