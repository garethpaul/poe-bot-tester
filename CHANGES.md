# Changes

## 2026-06-08

- Added a root `make check` wrapper for the full Next.js verification gate.
- Added deterministic App Router request-validation tests for `/api/analyze-bot`
  and `/api/test-bot`, including mocked-fetch coverage for the Poe request
  shape.
- Added shared Poe bot-name validation so route handlers reject malformed names
  before building Poe URLs or model requests.
- Added deterministic analyzer helper regression tests for Poe profile parsing, bot-name scoring, and description scoring.
- Wired `npm test` into `npm run verify` so lint, types, tests, build, and audit run as a single local gate.
- Updated contributor documentation to use `npm ci` and describe the new test command.
