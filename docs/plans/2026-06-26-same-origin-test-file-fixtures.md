# Same-Origin Test-File Fixtures

status: completed
priority: P1 correctness
date: 2026-06-26

## Problem

The full analyzer loaded bundled fixtures from
`http://localhost:3001/api/test-files`. That development-only authority is not
the deployed application authority, so production and preview runs could mark
PNG, JPEG, GIF, and PDF support as failed before contacting the tested bot.

## Decision

Build the fixed `/api/test-files` URL from the accepted request URL, retain the
actual application scheme, host, and development port, clear inherited URL
credentials, and set the fixture type with `URLSearchParams`. Pass the incoming
request URL through the file-support path rather than introducing ambient
configuration.

## Alternatives

- Keep `localhost:3001`: rejected because it cannot identify a deployed or
  preview application instance.
- Add a fixture-base environment variable: rejected because a bundled
  same-origin route should not require a second deployment authority setting.
- Duplicate fixture bytes inside the analyzer: rejected because two copies of
  the large fixtures would drift and enlarge the edge bundle unnecessarily.

## Verification

- The focused test failed first because `buildTestFileUrl` did not exist.
- Node 24 then passed credential-free same-origin URL construction for a hosted
  HTTPS request and a local request using a non-default port.
- The baseline rejects the old `localhost:3001` authority and guards the fixed
  path, credential clearing, request URL propagation, tests, and documentation.
- Node 20 and Node 24 `make check` passed lint, typecheck, all helper suites,
  production build, zero-vulnerability audit, root-hostility tests, and the
  baseline. The absolute Makefile gate also passed from `/tmp`.
- Two hostile mutations were rejected: restoring `localhost:3001` failed the
  baseline, and retaining inherited URL credentials failed the focused test.
- `git diff --check` passed. Hosted Node 20/24 validation remains the immutable
  merge gate.
