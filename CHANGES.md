# Changes

## 2026-06-09

- Added order-independent Poe metadata parsing for description and profile
  image meta tags.
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
