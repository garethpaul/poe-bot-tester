# Chunk Session Ownership Cleanup

Status: In Progress

## Problem

Chunk processing acquires an exact in-memory session object, but later writes
that object back unconditionally and successful completion deletes by session
ID alone. An overlapping stale request can therefore restore or remove a newer
replacement session after ownership has changed.

## Requirements

1. Never restore an acquired session after the session map no longer owns that
   exact object.
2. Release successful final sessions only when the map still owns the exact
   acquired object.
3. Preserve normal continuation, failure cleanup, bot binding, scoring, and SSE
   behavior.
4. Add mutation-sensitive contracts and truthful verification evidence.

## Scope Boundaries

- Do not add persistence, expiry, authentication, locking, dependencies, or
  retries.
- Do not change chunk scheduling, request validation, scoring, Poe requests, or
  SSE framing.
- Keep this change stacked on PR #9; do not merge or close either pull request
  without explicit owner authorization.

## Verification Plan

- Run focused route/static coverage and the complete deterministic suite on
  Node 20 and Node 24.
- Run lint, typecheck, production build, dependency audit, repository
  `make check`, and the absolute-Makefile gate from `/tmp`.
- Reject isolated mutations of exact-owner cleanup and stale-session write-back
  prevention.
- Audit the exact diff, generated artifacts, dependencies, credentials,
  conflicts, modes, binaries, and whitespace before commit and push.

## Work Completed

Pending implementation and validation.

## Verification Completed

Pending implementation and validation.
