# Chunk Session Concurrency Guard

Status: Planned

## Problem

Chunk requests for the same bot and session ID acquire the same mutable
in-memory session object. Because chunk processing is asynchronous, overlapping
requests can append duplicate results or calculate a terminal score while an
earlier chunk is still running.

## Requirements

1. Permit at most one active request for an in-memory chunk session.
2. Reject an overlapping same-bot request with a deterministic HTTP 409 before
   creating an SSE stream.
3. Release only the exact request lease after success or failure so later
   sequential chunks can continue normally.
4. Preserve bot binding, exact-session cleanup, scoring, validation, and SSE
   behavior.
5. Add behavioral and static tests that fail if overlap rejection or lease
   release is removed or moved too early.

## Scope Boundaries

- Do not add persistence, distributed locking, expiry, authentication,
  dependencies, retries, or client-side scheduling changes.
- Do not change chunk contents, scoring, Poe requests, or SSE framing.
- Keep this change stacked on PR #10; do not merge or close either pull request
  without explicit owner authorization.

## Verification Plan

- Run focused route/static coverage and the complete deterministic suite on
  Node 20 and Node 24.
- Run lint, typecheck, production build, dependency audit, repository
  `make check`, and the absolute-Makefile gate from `/tmp`.
- Reject isolated mutations of overlap detection, lease acquisition, exact
  lease release, behavioral coverage, guidance, and completed plan evidence.
- Audit the exact diff, generated artifacts, dependencies, credentials,
  conflict markers, modes, binaries, and whitespace before commit and push.
