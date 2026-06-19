# Poe Bot Tester Security and Quality Baseline

status: completed

## Status

Completed

## Context

`poe-bot-tester` is a Next.js 15 application with App Router API routes that call Poe-compatible bot endpoints and stream analysis progress to the browser. The repository currently has a clean default branch, a package lock, and no deterministic verification script beyond the default `next lint` command.

The current `npm audit --json` baseline reports 13 vulnerabilities: 1 low, 5 moderate, 5 high, and 2 critical. The highest-value fixes are removing the unused direct `axios` dependency, moving Next.js from `15.3.4` to a patched `15.5.x` release while keeping the app on the same major version, and pinning the vulnerable transitive PostCSS range to the audited fixed version.

## Objectives

- Reduce direct dependency risk by deleting unused packages instead of only patching them.
- Move the Next.js runtime and ESLint integration to the patched 15.x line.
- Replace the stale `next lint` script with an ESLint 9-compatible command.
- Ignore generated framework output in the flat ESLint config.
- Add a repo-level verification command that runs lint, TypeScript checking, production build, and audit.
- Update documentation so contributors know the expected quality gate.

## Work Items

1. Remove `axios` from dependencies if no imports exist in the application.
2. Upgrade `next` and `eslint-config-next` to `15.5.19`, the non-major audit fix reported for the current lockfile.
3. Add a `postcss` override for the fixed `8.5.15` transitive dependency baseline.
4. Add `typecheck`, `audit`, and `verify` scripts to `package.json`.
5. Run the full verification sequence and fix any lint, type, or build failures.
6. Mark this plan completed only after the updated lockfile and quality gate pass locally.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run audit`
- `npm run verify`

## Follow-Up Candidates

- Extract duplicated Poe API request handling across `analyze-bot`, `analyze-bot-stream`, and `analyze-bot-chunked`.
- Add API route unit tests around request validation, server-sent-event framing, and scoring helpers.
- Replace inline base64 fixture data with small checked-in test fixture files or generated fixtures.
