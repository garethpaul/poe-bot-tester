# Score Aggregation

status: completed

## Context

The standard, streaming, and chunked analyzers each duplicate the same overall
score calculation. Every copy divides by the result count without handling an
empty collection, which produces `NaN`, and none has focused regression
coverage for missing or non-finite scores. The roadmap explicitly calls for
expanding helper tests into full score aggregation.

## Requirements

- Add one dependency-free score aggregation helper shared by all three analyzer
  modes.
- Preserve the existing policy that a result without a valid score contributes
  zero while still participating in the average.
- Return zero for an empty result collection instead of `NaN`.
- Treat `NaN`, positive infinity, and negative infinity as zero contributions.
- Preserve whole-number rounding for valid finite scores, including negative
  and greater-than-100 inputs rather than silently clamping them.
- Add mutation-sensitive focused tests and static contracts for all call sites.

## Scope Boundaries

- Do not change individual test scoring, category membership, response-time
  derivation, route validation, request limits, Poe transport, or UI rendering.
- Do not add dependencies or live Poe requests.

## Verification Plan

- Run focused aggregation tests plus the complete test suite on Node 20 and
  Node 24.
- Run lint, typecheck, production build, audit, and every Make gate on both
  declared runtimes.
- Run hostile mutations against empty input, missing/non-finite handling,
  rounding, and all three production call sites.
- Inspect the exact diff, protected paths, generated artifacts, secrets,
  captured prompts, dependency drift, and completed plan evidence.

## Work Completed

- Added `calculateOverallScore` as one dependency-free helper that validates
  unknown result entries, counts missing or invalid scores as zero, returns zero
  for empty input, and preserves finite rounded values without clamping.
- Replaced duplicated aggregation in the standard, streaming, and chunked
  analyzers with the shared helper.
- Added focused empty, rounding, missing-score, non-finite, negative, and
  greater-than-100 fixtures plus implementation, call-site, documentation, and
  completed-plan contracts.

## Verification Completed

- Node 20.19.5: focused tests and `npm run typecheck` passed.
- Node 20.19.5: the lint, typecheck, test, production build, audit, and
  `make check` components passed before the completed-evidence rerun.
- Node 20.19.5 and Node 24.16.0: `make check` passed lint, typecheck, focused
  tests, the Next.js 16.2.9 production build, the moderate audit, and the
  repository baseline checker.
- Eight focused hostile mutations covering empty input, finite validation,
  rounding, all three analyzer call sites, the empty fixture, and plan status
  were rejected.
- Portable shell syntax and `git diff --check` passed during focused validation.
- Exact-path, protected-path, generated-artifact, secret, captured-prompt, and
  dependency-drift scans passed.
