# Safe Makefile Root Resolution

status: completed

## Context

The Makefile ignored command-line `REPO_ROOT` values but still trusted the
caller-controlled `MAKEFILE_LIST`, executable, and shell variables. Recipe
root interpolation also allowed checkout-name backticks to execute. A hostile
invocation could therefore redirect or execute content outside the review.

## Scope Boundaries

- Do not change Next.js, React, route, session, SSE, scoring, dependency,
  lockfile, API credential, or network behavior.
- Do not contact Poe services.
- Preserve the full lint, typecheck, test, production build, and audit gates.

## Work Completed

- Reject command-line and environment replacement of `MAKEFILE_LIST`.
- Canonicalize the checked-in Makefile directory through quoted POSIX tools.
- Protect `REPO_ROOT`, `NPM`, `NODE`, `SHELL`, and `.SHELLFLAGS` from caller
  redirection.
- Reject `MAKEFILES` preloads and ambiguous multiple-`-f` invocations before a
  repository quality command runs.
- Add dependency-free executable coverage for all eight public Make targets.

## Verification Completed

- `make lint`, `make typecheck`, `make test`, `make build`, `make audit`,
  `make root-test`, `make verify`, and `make check` passed.
- All 88 executed target/authority combinations passed from a temporary
  checkout path containing spaces, quotes, brackets, apostrophes, and
  backticks.
- Both `MAKEFILE_LIST` override channels, a MAKEFILES preload, and an ambiguous
  multiple-Makefile invocation failed closed.
- The full Next.js production build and zero-vulnerability moderate audit
  passed without live Poe calls.
