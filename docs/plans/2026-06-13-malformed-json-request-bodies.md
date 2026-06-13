# Malformed JSON Request Bodies

status: completed

## Summary

Make every POST API route reject malformed or non-object JSON request bodies
with a stable HTTP 400 response before validation, upstream fetches, or stream
creation. Preserve each route's existing JSON-versus-text response style and
all valid-request behavior.

## Problem Frame

The four POST routes call `request.json()` directly. Parse failures currently
escape from the streaming routes, become a generic analysis 500 in the main
analyzer, and are mislabeled as an upstream Poe 502 in the bot test route.
Clients need a deterministic request-boundary error, and malformed input must
never trigger Poe work.

## Requirements

- R1. Parse request bodies through one shared API helper that accepts only JSON
  objects and treats malformed JSON, arrays, primitives, and `null` as invalid.
- R2. Return HTTP 400 with the stable message `Request body must be a JSON
  object` from `analyze-bot`, `test-bot`, `analyze-bot-stream`, and
  `analyze-bot-chunked`.
- R3. Preserve JSON error bodies on JSON routes and text error bodies on the
  streaming route.
- R4. Prove invalid bodies are rejected before `fetch`, stream creation, or Poe
  metadata analysis.
- R5. Preserve existing required-field, bot-name, chunk-index, session-ID,
  transport-error, timeout, and successful-request behavior.
- R6. Document the request-boundary contract and enforce source, tests,
  guidance, and completed verification evidence in the baseline checker.

## Key Technical Decisions

- Use a dependency-free shared parser beside the API routes instead of four
  independent `try/catch` blocks, keeping the error contract consistent.
- Return a discriminated parse result so valid empty objects continue into the
  existing required-field validation while invalid JSON shapes stop at the
  boundary.
- Keep route-specific response serialization; this change standardizes status
  and message, not every API response format.

## Implementation Units

### U1. Shared Request Parser

Add the shared JSON-object parser and stable error constant under `src/app/api/`.

Test scenarios:
- A valid object is returned for route validation.
- Malformed JSON, arrays, primitives, and `null` return the invalid result.

### U2. Route Boundary Integration

Use the shared parser in all four POST routes before destructuring fields or
creating streams, preserving each route's current response format.

Test scenarios:
- Every route returns 400 and the stable message for malformed JSON.
- Representative non-object JSON bodies return the same 400 contract.
- The injected fetch spy remains untouched for every invalid body.
- Existing missing-field and invalid-name assertions remain unchanged.

### U3. Durable Contract And Evidence

Update repository guidance, changelog, deterministic route tests, and the
baseline checker. Record completed dual-runtime and mutation evidence only
after the implementation passes.

Test scenarios:
- Removing a route integration, parser shape check, regression assertion,
  guidance statement, completed status, or verification evidence makes the
  baseline checker fail.

## Scope Boundaries

- Do not change Poe URLs, credentials, request payloads, timeout values,
  scoring, streaming event formats, sessions, chunk definitions, or UI code.
- Do not add direct dependencies or alter the workflow, Next configuration,
  deployment configuration, or environment contract. A lockfile-only
  transitive security refresh is allowed when required by the audit gate.
- Do not convert all route errors to one serialization format.

## Verification Plan

- Node 20 and Node 24 clean installation, dependency graph, all Make gates,
  production build, and moderate-level audit
- focused malformed and non-object JSON route assertions with a no-fetch spy
- checker execution from an external working directory
- package, lockfile, workflow, configuration, and SVG parsing
- hostile mutations for parser, route, test, guidance, status, and evidence
  contracts
- exact-path and protected-path diff audit, `git diff --check`, and secret,
  captured-prompt, generated-artifact, and dependency-drift scans

## Work Completed

- Added one shared JSON-object request parser and integrated it into all four
  POST routes before field validation, stream creation, or upstream work.
- Added deterministic malformed and non-object body regressions while
  preserving route-specific JSON and text response formats.
- Updated guidance and the baseline checker, and refreshed the transitive
  `esbuild` lockfile family to 0.28.1 after the audit began rejecting 0.28.0.

## Verification Completed

- Node 20 and Node 24 passed clean installation, dependency graph validation,
  every Make target including `make check`, production build, and the
  moderate-level audit.
- `esbuild 0.28.1` resolved the published high- and low-severity advisories;
  `package.json` and the direct dependency set remained unchanged.
- Focused malformed and non-object route assertions passed and proved the
  injected fetch spy remained untouched.
- The checker passed from an external working directory, and package, lockfile,
  workflow, configuration, and SVG files parsed.
- 10 hostile mutations rejected parser, route, test, guidance, lockfile,
  status, and evidence drift.
- The protected runtime paths had only the intended request-boundary diff.
- `git diff --check` passed.
- The secret, captured-prompt, generated-artifact, and dependency-drift scan
  found no prohibited content or unintended artifacts in the intended paths.
