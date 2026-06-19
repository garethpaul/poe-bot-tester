---
title: Location-Independent Make Gates
type: fix
date: 2026-06-14
---

# Location-Independent Make Gates

status: completed

## Summary

Make repository verification target the checkout that owns the Makefile from
any caller directory, with mutation-sensitive enforcement for every recipe.

## Problem Frame

The current Makefile runs npm and the portable checker relative to the caller.
An absolute Makefile invocation from fleet automation can therefore lint,
typecheck, test, build, audit, or inspect the wrong directory.

## Requirements

- R1. Derive an override-protected absolute repository root from the loaded
  Makefile.
- R2. Run lint, typecheck, test, build, audit, verify, and the baseline checker
  from that root without changing the target graph or package scripts.
- R3. Require the exact root declaration and every rooted recipe in the
  portable checker so partial fixes fail closed.
- R4. Preserve application behavior, dependencies, lockfile, Next.js and
  TypeScript configuration, workflow, generated-cache cleanup, and API routes.

## Assumptions

- GNU Make behavior in the existing Ubuntu hosted lanes supports deriving the
  repository from the loaded Makefile path.
- Direct checker execution remains independently portable because the shell
  script already derives its own root.

## Implementation Units

### U1. Root every Make gate

**Files:** `Makefile`

Use one override-protected root for all npm recipes and the checker while
preserving the existing aliases and sequencing.

**Test scenarios:**

- Run every alias from the repository root on Node 20 and Node 24.
- Run the full gate through the absolute Makefile path from an unrelated
  directory on both runtimes.
- Supply a conflicting root variable and confirm the repository-owned root
  still wins.

### U2. Enforce and record the contract

**Files:** `scripts/check-baseline.sh`,
`docs/plans/2026-06-14-location-independent-make.md`

Add exact contracts for root derivation and all seven rooted recipes, then
record completed evidence after final validation.

**Test scenarios:**

- Mutate root derivation and each recipe independently and confirm every case
  is rejected.
- Confirm the full Next.js build, typecheck, tests, lint, and audit remain
  successful on both supported runtimes.
- Confirm clean shell syntax, whitespace, intended paths, generated artifacts,
  credential patterns, dependencies, and protected source/config paths.

## Scope Boundaries

- No UI, API route, scoring, request-body, streaming, or transport behavior
  changes.
- No package, lockfile, workflow, framework, compiler, or environment changes.
- No browser test is required because the change has no browser-facing route or
  rendering effect.

## Verification

Completion requires all Make aliases from the repository root, external full
checks on Node 20 and 24 with override resistance, eight isolated hostile
mutations, successful Next.js production builds, and clean safety audits.

## Work Completed

- Added an override-protected repository root and used it for lint, typecheck,
  test, build, audit, verify, and portable-checker execution without changing
  the target graph.
- Extended the baseline checker to require the root declaration and all seven
  rooted recipes exactly.
- Preserved application sources, dependencies, lockfile, framework and compiler
  configuration, workflow, and generated-cache cleanup behavior.

## Verification Completed

- Node 20.19.5 and Node 24.16.0 passed lint, typecheck, deterministic tests,
  Next.js 16.2.9 production builds, and moderate audits with zero known
  vulnerabilities.
- Both runtimes passed the absolute Makefile path from /tmp verification with a
  hostile `REPO_ROOT=/tmp` override, proving repository-owned root selection.
- The checker rejected eight isolated hostile mutations covering root
  derivation and every rooted recipe after a disposable baseline passed.
- Portable shell syntax, `git diff --check`, intended-path, generated-artifact,
  credential-pattern, dependency-state, and protected source/config/workflow
  checks passed.
