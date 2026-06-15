# Chunk Session Bot Binding

Status: In Progress

## Problem

The chunked-analysis route accepts caller-provided session IDs and reuses an
existing in-memory session without confirming that the requested bot matches
the bot that created the session. Reusing a valid session ID with another bot
can mix results across analyses and produce a scorecard for the wrong bot.

## Requirements

1. Bind each active chunk session to the normalized bot name that created it.
2. Reject reuse of an active session ID for a different bot before creating an
   SSE response or making any Poe request.
3. Return a deterministic JSON conflict response without exposing session data.
4. Preserve same-bot continuation, generated session IDs, chunk validation,
   streaming, scoring, and final-session cleanup.
5. Add route-level regression coverage and mutation-sensitive static contracts
   for the ownership check, conflict status, and pre-stream ordering.

## Scope Boundaries

- Do not redesign in-memory session storage or add a database, cache, expiry,
  authentication scheme, or dependency.
- Do not change bot-name normalization, SSE framing, chunk scheduling, scores,
  Poe request behavior, or the client workflow.
- Do not require live Poe credentials or network access for tests.
- Do not merge or close stacked pull requests without explicit authorization.

## Verification: Pending

- Run the focused route suite and the full deterministic package gate.
- Run lint, typecheck, production build, dependency audit, and full `make check`
  from the repository and via the absolute Makefile path externally.
- Reject focused hostile mutations covering the ownership predicate, conflict
  status, pre-stream ordering, test wiring, and completed plan evidence.
- Audit the final intended diff, generated artifacts, credentials, conflict
  markers, and whitespace before commit.
