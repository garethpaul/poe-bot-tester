# Safe Makefile Root Resolution

status: completed

## Context

The Makefile ignored command-line `REPO_ROOT` values but still trusted the
caller-controlled `MAKEFILE_LIST` and `NPM` variables. A hostile invocation
could redirect every documented quality gate outside the reviewed checkout.

## Scope Boundaries

- Do not change Next.js, React, route, session, SSE, scoring, dependency,
  lockfile, API credential, or network behavior.
- Do not contact Poe services.
- Preserve the full lint, typecheck, test, production build, and audit gates.

## Work Completed

- Reject command-line and environment replacement of `MAKEFILE_LIST`.
- Canonicalize the checked-in Makefile directory through quoted POSIX tools.
- Protect both `REPO_ROOT` and `NPM` from caller redirection.
- Add dependency-free coverage for all eight public Make targets.

## Verification Completed

- `make lint`, `make typecheck`, `make test`, `make build`, `make audit`,
  `make root-test`, `make verify`, and `make check` passed.
- All 40 target and root/npm override combinations passed from a temporary
  checkout path containing spaces and an apostrophe.
- Both command-line and environment `MAKEFILE_LIST` overrides failed closed.
- The full Next.js production build and zero-vulnerability moderate audit
  passed without live Poe calls.
