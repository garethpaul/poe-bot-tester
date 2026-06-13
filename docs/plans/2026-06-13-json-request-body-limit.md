# Bound JSON Request Bodies

status: completed

## Summary

Add an application-level byte boundary before the Poe tester parses JSON POST
bodies. The shared parser already rejects malformed and non-object JSON, but
`Request.json()` buffers and parses the entire body before that shape boundary
can run.

## Priority

The four public POST routes accept credentials and can start remote Poe work or
long-running analysis. Bounding untrusted input before parsing reduces memory
amplification and gives clients a deterministic failure contract.

## Prioritized Engineering Backlog

1. Bound streamed JSON request bodies before parsing or route work.
2. Add per-route request rate limits at the deployment boundary.
3. Replace in-memory chunk sessions with bounded, expiring storage in a
   separately reviewed compatibility change.

## Requirements

- R1. The shared request parser must enforce a 64 KiB maximum by raw byte
  length, not JavaScript character count.
- R2. A declared `Content-Length` above the limit must return an oversized
  result before reading the request stream.
- R3. Chunked or missing-length bodies must be read incrementally and stop as
  soon as accumulated bytes exceed the limit.
- R4. Oversized bodies must return HTTP 413 with the stable message `Request
  body is too large` from `analyze-bot`, `test-bot`, `analyze-bot-stream`, and
  `analyze-bot-chunked`.
- R5. Malformed, primitive, array, and null bodies must preserve the existing
  HTTP 400 `Request body must be a JSON object` contract.
- R6. Rejected bodies must not invoke fetch, bot analysis, stream creation, or
  chunk-session mutation.
- R7. Existing route-specific JSON versus text error serialization, valid-body
  behavior, bot-name validation, timeouts, scoring, and streaming event formats
  must remain unchanged.
- R8. Deterministic tests and the baseline checker must reject missing limits,
  character-count limits, unbounded stream reads, route omissions, and stale
  verification evidence.

## Key Technical Decisions

- Read `Request.body` through its `ReadableStream` reader so chunked requests
  can be stopped without buffering the full body.
- Use one discriminated parser result for valid objects, invalid JSON, and
  oversized bodies. This keeps all routes aligned without collapsing their
  response serialization formats.
- Treat invalid, negative, or non-integer `Content-Length` as untrusted metadata
  and still enforce the streamed byte count.
- Keep the limit fixed and exported beside the shared parser. Deployment-level
  limits may be stricter, but route correctness must not depend on them.

## Implementation Units

### U1. Bounded Shared Parser

**Files:** `src/app/api/request-body.ts`

- Add the byte limit, stable oversized error, incremental stream reader, UTF-8
  decoding, JSON parsing, and object-shape classification.
- Release the stream reader on every terminal path.

### U2. Route Boundary Integration

**Files:** `src/app/api/analyze-bot/route.ts`,
`src/app/api/test-bot/route.ts`, `src/app/api/analyze-bot-stream/route.ts`,
`src/app/api/analyze-bot-chunked/route.ts`

- Map oversized results to 413 before destructuring fields or creating route
  work.
- Preserve each route's existing JSON or text response format.

### U3. Regression And Contract Coverage

**Files:** `scripts/test-analyze-bot.ts`, `scripts/check-baseline.sh`

- Cover declared oversized bodies, chunked oversized bodies, exact-limit
  multibyte bodies, malformed bodies, all four route responses, and no-work
  assertions.
- Enforce source integration and completed plan evidence with mutation-sensitive
  static contracts.

### U4. Guidance And Evidence

**Files:** `README.md`, `SECURITY.md`, `VISION.md`, `CHANGES.md`

- Document that the route limit bounds application parsing but does not replace
  platform, proxy, concurrency, or rate-limit controls.

## Scope Boundaries

- Do not change Poe URLs, credentials, payloads, scoring, chunk definitions,
  sessions, timeout values, or UI behavior.
- Do not add dependencies or alter workflow, Next, deployment, or environment
  configuration.
- Do not claim the application limit replaces upstream transport limits or
  request rate limiting.

## Verification Plan

- Node 20 and Node 24 clean installation, dependency graph, all Make gates,
  production build, and moderate-level audit
- focused parser and four-route assertions with no-fetch/no-analysis spies
- checker execution from an external working directory
- package, lockfile, workflow, configuration, and SVG parsing
- hostile mutations covering byte counting, stream cancellation, route
  integration, tests, guidance, plan status, and evidence
- exact-path/protected-path audit, `git diff --check`, and secret,
  captured-prompt, generated-artifact, and dependency-drift scans

## Work Completed

- Added a shared 64 KiB streamed JSON request body limit with early rejection
  for oversized declared `Content-Length` values and incremental raw-byte
  counting for chunked or missing-length requests.
- Added stable oversized-versus-invalid parser results and mapped all four POST
  routes to HTTP 413 or the existing HTTP 400 response without starting fetch,
  analysis, stream, or chunk-session work.
- Added exact-limit multibyte, declared-length, stream cancellation,
  stream-failure, malformed-body, route-integration, and no-fetch assertions.
- Extended the baseline checker and project guidance without changing
  dependencies, workflows, build configuration, Poe transport behavior, or
  route response formats.

## Verification Completed

- Node 20.19.5: clean `npm ci`, lint, typecheck, focused route tests, production
  build, moderate audit, static baseline, and `make check` passed.
- Node 24.16.0: clean `npm ci`, lint, typecheck, focused route tests, production
  build, moderate audit, static baseline, and `make check` passed.
- The checker passed from an external working directory. Ten hostile mutations rejected
  changes to the 64 KiB constant, declared-length check,
  raw-byte counting, stream cancellation, bounded reader, route status,
  route tests, guidance, plan status, and completed evidence.
- `git diff --check` passed. The exact-path audit found only the intended
  implementation, tests, checker, plan, and guidance changes. The secret, captured-prompt, generated-artifact, and dependency-drift scan found no added
  credentials, artifacts, package changes, or workflow changes.
