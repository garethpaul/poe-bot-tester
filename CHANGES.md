# Changes

## 2026-07-16 06:25 PDT - P2 - Drop EOL Node 20; assert version floors, not literals

### Summary

CI tested Node 20, which reached end of life on 2026-04-30 and no longer
receives upstream security releases. The baseline required the exact string
`node-version: [20, 24]`, so it forbade both halves of the fix: dropping the EOL
major and adding a newer one. The matrix is now `[22, 24]` (both supported LTS),
and the contract asserts a supported-version floor instead of a literal.

### Work completed

- `.github/workflows/check.yml` — matrix `[20, 24]` -> `[22, 24]`. Node 22 is
  supported until 2027-04-30 and Node 24 until 2028-04-30, per
  https://endoflife.date/api/nodejs.json.
- `scripts/check-baseline.sh` — replaced the exact-matrix grep with
  `MINIMUM_SUPPORTED_NODE_MAJOR=22`: parse the matrix, reject any major below the
  floor, and require at least two majors. Raising the floor is now the intended
  action when a major reaches EOL.
- `scripts/check-baseline.sh` — the esbuild assertion required
  `version === "0.28.1"`, so the contract named for a security fix blocked the
  next one. It is now a floor: at or above 0.28.1.

### Verification

- `make check` exit 0; `npm test` exit 0; `git diff --check` clean.
- Node floor mutations: `[20, 24]` -> rejected ("past end of life"), where it was
  previously *required*; `[22, 24, 26]` -> allowed, where it was previously
  blocked; `[24]` -> rejected (fewer than two majors).
- esbuild floor mutations: 0.28.2 and 0.29.0 -> allowed, where any change was
  previously blocked; 0.28.0 -> rejected, so the reviewed fix cannot regress.

### Notes

- Node 26 is deliberately not added: it becomes LTS on 2026-10-28. The floor
  permits it whenever that is wanted, without another contract edit.

### Files changed

- `.github/workflows/check.yml` — supported Node matrix.
- `scripts/check-baseline.sh` — Node floor and esbuild floor.

## 2026-06-26 12:05 PDT - P1 - Restore deployed file-support analysis

- **Priority:** P1 correctness; the full analyzer always requested bundled
  fixtures from `localhost:3001`, so deployed runs reported supported fixture
  types as unavailable.
- **Summary:** derive the fixed `/api/test-files` path from the incoming
  request's same origin, remove inherited URL credentials, and preserve local
  ports for development and preview environments.
- **Files:** `src/app/api/analyze-bot/route.ts`,
  `scripts/test-analyze-bot.ts`, `scripts/check-baseline.sh`, `AGENTS.md`,
  `README.md`, `SECURITY.md`, `VISION.md`, and
  `docs/plans/2026-06-26-same-origin-test-file-fixtures.md`.
- **Tests:** focused Node 24 regression passed after failing because the URL
  builder did not exist; Node 20 and Node 24 `make check` passed lint,
  typecheck, all helper suites, production build, zero-vulnerability audit,
  root-hostility tests, and the baseline contract. The absolute Makefile gate
  also passed from `/tmp`.
- **Findings:** no live Poe credential or external bot request is required to
  prove URL construction.
- **Blockers:** Codex review may be unavailable because the local reviewer has
  repeatedly returned HTTP 401; if so, skip it once as authorized.
- **Next action:** open a PR after two hostile mutations rejected the fixed
  development port and retained URL credentials, then merge only the exact
  hosted-green head.

## 2026-06-21

- Hardened all eight public Make gates against file-list, root, executable, and
  shell redirection, with dependency-free executable hostile coverage.

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
