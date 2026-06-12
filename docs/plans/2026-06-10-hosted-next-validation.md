# Hosted Next Validation

status: completed

## Context

The app has a lockfile and a full local gate covering lint, typecheck, focused
bot-analysis tests, production build, dependency audit, and repository
contracts. No hosted validation currently runs that gate.

## Priorities

1. Run the full gate on Node 20 and Node 24.
2. Install dependencies exactly with `npm ci`.
3. Preserve route input, session, chunk, fixture, and metadata guards.
4. Verify the production Next.js build and moderate-level audit.
5. Keep Poe credentials and live bot analysis requests out of CI.

## Implementation Units

Add a commit-pinned, read-only hosted Linux matrix with fixed runner, timeout,
and concurrency cancellation. Enforce the workflow contract from the shell
baseline.

## Verification

- `npm ci --ignore-scripts`
- `npm test`
- `make check`
- Node 20 and Node 24 full gate execution
- workflow YAML parse
- `git diff --check`
- successful hosted Linux `Check` workflow for both Node versions

## Boundaries

- Do not provide Poe credentials or make live bot requests.
- Do not change API route behavior in this pass.
- Do not update dependencies outside the existing lockfile.
