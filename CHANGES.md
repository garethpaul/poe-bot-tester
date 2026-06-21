# Changes

## 2026-06-21

- Hardened all eight public Make gates against `MAKEFILE_LIST`, `REPO_ROOT`,
  and `NPM` redirection, with dependency-free hostile invocation coverage.

## 2026-06-16

- Enforced an exact chunk sequence so new sessions start at chunk 0 and replayed
  or skipped chunks cannot duplicate or omit score inputs.
- Overlapping requests for one chunk session now receive HTTP 409 until the
  active request releases its exact in-flight lease.
- Exact-session ownership now governs successful final chunk cleanup, and
  chunk processing no longer restores stale acquired sessions after ownership
  changes.

## 2026-06-15

- Terminal streamed completion cancels the response reader and always releases its lock.
- Terminal chunk stream failures release their exact in-memory sessions before
  error emission, preventing stale cross-bot ownership conflicts.

## 2026-06-14

- Buffered browser-side SSE data across network chunk boundaries so split JSON
  progress and completion records are delivered exactly once instead of being
  discarded as malformed fragments.

## 2026-06-13

- Shared overall score aggregation across all analyzer modes and added focused
  empty, missing, non-finite, rounding, and range regression coverage.

- Rejected malformed and non-object JSON request bodies with stable HTTP 400
  responses before validation, stream creation, or Poe requests.
- Added a 64 KiB JSON request body limit with stable HTTP 413 responses before
  parsing, validation, stream creation, or Poe requests.
- Refreshed the transitive `esbuild` lockfile family to 0.28.1 after the
  moderate-level audit began rejecting 0.28.0 for two published advisories.

## 2026-06-12

- Upgraded to Next.js 16.2.9 and React 19.2.7, refreshed the compatible
  Tailwind, ESLint 9, TypeScript 5.9, and type-package toolchain, and retained a
  zero-vulnerability lockfile.
- Replaced the legacy FlatCompat bridge with Next 16's native flat ESLint
  exports and adopted its required React JSX and development route types.
- Added one shared five-second timeout to Poe bot-page metadata requests across
  non-streaming, streaming, and chunked analyzer modes.
- Added static route coverage preventing missing abort signals or route-local
  timeout drift while preserving existing metadata fallback behavior.

## 2026-06-10

- Added pinned, credential-free, read-only GitHub Actions validation on Node 20
  and Node 24 using lockfile installation and the full `make check` gate.
- Rejected unknown test file types, including inherited object keys, before
  decoding fixture data.
- Replaced raw `/api/test-bot` transport exceptions with stable `502` and `504`
  responses.

## 2026-06-09

- Added order-independent Poe metadata parsing for description and profile
  image meta tags.
- Added `scripts/check-baseline.sh` to protect package script wiring, completed
  plan metadata, and local secret/editor ignores from `make check`.
- Rejected invalid chunked analysis session IDs before opening progress streams
  or touching in-memory session state.
- Cleared root TypeScript build-info before typechecks, and cleared stale
  `.next` output plus root build-info before production builds, so repeated
  local Next.js gates do not reference removed generated files.

## 2026-06-08

- Added a root `make check` wrapper for the full Next.js verification gate.
- Added deterministic App Router request-validation tests for `/api/analyze-bot`
  and `/api/test-bot`, including mocked-fetch coverage for the Poe request
  shape.
- Added shared Poe bot-name validation so route handlers reject malformed names
  before building Poe URLs or model requests.
- Aligned description scoring so `parameter` and `cannot` evidence receives the
  same passing scores as equivalent `--` and `limitation` wording.
- Treated blank bot descriptions as missing before description scoring.
- Rejected blank API keys and prompts before analysis or bot-test routes make
  upstream Poe requests.
- Replaced random streaming analyzer placeholder scores with deterministic
  pending or fixture-backed results.
- Added deterministic streaming analyzer scoring coverage to the local test
  script.
- Rejected invalid chunked analysis indexes before opening progress streams.
- Added deterministic analyzer helper regression tests for Poe profile parsing, bot-name scoring, and description scoring.
- Wired `npm test` into `npm run verify` so lint, types, tests, build, and audit run as a single local gate.
- Updated contributor documentation to use `npm ci` and describe the new test command.
