# Score Aggregation

status: pending

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

Pending implementation.

## Verification Completed

Pending implementation and validation.
