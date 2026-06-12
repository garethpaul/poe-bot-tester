# Next 16 toolchain modernization

status: completed

## Context

The audited application remains on Next.js and eslint-config-next 15.5.19 while
the current stable framework line is 16.2.9. Its lockfile also predates current
React 19, Tailwind 4, ESLint, TypeScript 5, and type-package releases. Next
16.2.9 requires Node 20.9 or newer, which is compatible with the repository's
existing Node 20.19 and Node 24 validation matrix.

## Decision

1. Upgrade Next.js and eslint-config-next together to 16.2.9.
2. Upgrade React and React DOM to 19.2.7 and align their type packages.
3. Refresh Tailwind 4, ESLint, TypeScript 5.9, TSX, and Node 20 typings without
   introducing unrelated runtime or type-system major changes.
4. Regenerate the lockfile through npm and require a zero-vulnerability audit.
5. Preserve the credential-free Node 20/24 gate, deterministic Poe transport
   tests, production build, timeout policy, and repository baseline checks.
6. Enforce the framework versions and completed verification in the baseline
   checker so the modernization cannot silently drift backward.

## Verification

- Node 20.19.5 and Node 24.16.0 completed clean `npm ci --ignore-scripts`
  installations and `npm ls --all` without invalid peer dependencies.
- Both runtimes passed lint, TypeScript checking, deterministic analyzer tests,
  and the Next.js 16.2.9 Turbopack production build.
- `npm audit --audit-level=moderate` reported zero vulnerabilities on both
  installed graphs.
- Repeated builds preserved the reviewed `tsconfig.json` settings without
  additional framework rewrites.
- Twelve hostile mutations covering framework, React, ESLint, TypeScript,
  FlatCompat, native lint configuration, TypeScript settings, documentation,
  and plan status were all rejected.
- Six older completed plans were normalized with one canonical
  `status: completed` line so the stricter status check records their existing
  completed work truthfully.
