# Gate Exit-Status Observers

status: completed
priority: P1 correctness
date: 2026-07-17

## Problem

The baseline asserted that source text exists but not that the runners gate.
Four mutations were applied to a clean, green tree; `make check` exited 0 for
every one:

1. `check: verify` reduced to `check:`. `make check` then ran only
   `scripts/check-baseline.sh` — no lint, typecheck, test, build, audit, or
   root-test — and exited 0. The pin `grep -Fq "check:"` is satisfied by
   `check:` itself, so a target-name pin cannot see its own prerequisites
   disappear.
2. `|| true` appended to the `check-baseline.sh` recipe. The checker still ran
   and still printed its verdict, but `make check` exited 0. The pin
   `cd "$$REPO_ROOT" && scripts/check-baseline.sh` is a *prefix* of the same
   line with `|| true` appended, so every text pin stayed green.
3. `|| true` appended to CI's `- run: make check`, making the only hosted step
   report success unconditionally. `grep -Fq "run: make check"` still matched.
4. `MAX_JSON_BODY_BYTES = 64 * 1024` widened to `64 * 1024 * 16`. The pin
   matched because `64 * 1024` is a substring of `64 * 1024 * 16`, and every
   oversize fixture was written as `MAX_JSON_BODY_BYTES + 1` or
   `MAX_JSON_BODY_BYTES - 12`, so the fixtures widened with the constant. The
   64 KiB limit promised by README, SECURITY, VISION, and CHANGES became false
   while the baseline stayed green.

`scripts/test-makefile-root.mjs` — the only executable observer — passed against
all four. It asserted that each target dispatched a command from the checkout,
which a `|| true` recipe does identically. A dispatch log proves a runner ran,
never that it gates. It also runs inside `make check`, so a recipe that swallows
its exit status discards the verdict of the detector meant to police it.

## Decision

Close the exit-status channel at three levels, weakest to strongest:

- **Whole-line pins.** Match every Makefile rule and recipe line and every CI
  run step with `grep -Fx`, so an appended suffix or a dropped prerequisite no
  longer prefix-matches. Pin `MAX_JSON_BODY_BYTES` to its exact line.
- **Per-command failure injection.** `test-makefile-root.mjs` already builds a
  fake `npm`, `node`, and `check-baseline.sh`; it now makes one of them exit 1
  at a time across 11 command/target pairs and requires the failure to reach
  `make`'s exit status. This is executable proof of gating, not of dispatch.
- **Out-of-band CI observers.** `scripts/check-baseline.sh` and
  `node scripts/test-makefile-root.mjs` run as their own CI steps, so their exit
  status reaches the job without passing through a Makefile recipe. This is the
  only layer that survives `|| true` on the `make check` recipe.

Literal-valued boundary fixtures (65536 / 65537) hold the body limit at the
documented 64 KiB independently of the constant under test.

## Alternatives

- In-gate pins only: rejected. The checker detects the violation and prints it,
  and `make check` still exits 0. An in-gate pin is worthless alone, however
  well anchored, because `|| true` destroys the channel its verdict travels on.
- Assert dispatched command arguments in the root test: rejected. The fake
  interpreter receives identical arguments whether or not the recipe swallows
  the status, so even an ordered dispatch log cannot distinguish the two.
- Rely on the root test alone: rejected. It runs inside `make check` and is
  therefore downstream of the recipe it would police.

## Verification

- Baseline established green first: `make check` exited 0 on the unmodified
  clean tree before any probe.
- All four mutations above were re-run against the fix. Each is now rejected,
  with the catch attributed to a specific line:
  - `check:` and the recipe `|| true` fail the whole-line Makefile pins.
  - CI `|| true` fails the whole-line workflow step pins.
  - The widened constant fails the exact-line pin *and*, independently, the
    behavioural literal fixture (`too_large` expected, `invalid` observed).
- Failure injection was confirmed to catch the recipe `|| true` executably:
  `make check ignored a failing scripts/check-baseline.sh`.
- Attribution was traced, not assumed. With the tautological
  `assert.equal(MAX_JSON_BODY_BYTES, LITERAL_MAX_JSON_BODY_BYTES)` removed, the
  literal 65537 fixture still caught the widened bound, proving the behavioural
  assertion is load-bearing rather than decorative.
- The fix was attacked. Deleting the new direct observer step is caught through
  the still-intact `make check` channel; hollowing `FAILURE_INJECTIONS` is
  caught by the `injectedCases === 11` count assert. The two channels
  cross-protect: each detects the other's neutering.
- Every mutation was applied by hand, confirmed to import and run, counted
  before and after, and reverted only on its own path.
- `make check` passes on the fixed tree: lint, typecheck, all helper suites,
  production build, zero-vulnerability audit, root-hostility tests with 11
  failure-injection cases, and the baseline.

## Known limit

If every CI run step is neutered in the same commit, no unneutered channel
remains inside the repository to report it; `check-baseline.sh` still detects and
prints the violation locally, but no step would propagate its exit status. A gate
cannot detect its own total disconnection. Branch protection requiring these
checks is the out-of-repo control for that case; this plan does not claim to
solve it.
