# AGENTS.md

## Repository purpose

`garethpaul/poe-bot-tester` is a JavaScript web application or frontend sample. Test poe bots with SSE

## Project structure

- `Makefile` - repository verification targets
- `scripts` - baseline checks and helper scripts
- `docs` - plans, notes, and generated README assets
- `src` - primary source code
- `package.json` - Node package metadata and scripts

## Development commands

- Install dependencies: `npm ci`
- Full baseline: `make check`
- Combined verification: `make verify`
- Lint/static checks: `make lint`
- Tests: `make test`
- Build: `make build`
- package script `dev`: `npm run dev`
- package script `start`: `npm start`
- package script `build`: `npm run build`
- package script `lint`: `npm run lint`
- package script `typecheck`: `npm run typecheck`
- package script `test`: `npm test`
- package script `verify`: `npm run verify`
- package script `audit`: `npm run audit`
- If a command above skips because a platform toolchain is missing, verify on a machine with that SDK before claiming platform behavior is tested.

## Coding conventions

- Language mix noted in the README: TypeScript (7), React TSX (2).
- Keep React components controlled and covered by component tests when props or rendering behavior changes.
- Next.js routes, pages, and API handlers should stay aligned with the existing app structure.

## Testing guidance

- Test-related files detected: `docs/plans/2026-06-08-analyze-bot-helper-tests.md`, `docs/plans/2026-06-08-api-route-validation-tests.md`, `docs/plans/2026-06-08-poe-bot-tester-check-wrapper.md`, `docs/plans/2026-06-08-poe-bot-tester-security-quality-baseline.md`, `docs/plans/2026-06-09-poe-bot-tester-blank-input-validation.md`, `docs/plans/2026-06-09-poe-bot-tester-chunk-index-validation.md`, `docs/plans/2026-06-09-poe-bot-tester-description-normalization.md`, `docs/plans/2026-06-09-poe-bot-tester-description-score-alignment.md`, `docs/plans/2026-06-09-poe-bot-tester-deterministic-stream-scores.md`, `docs/plans/2026-06-09-poe-bot-tester-meta-attribute-order.md`
- Start with the narrowest relevant test or Make target, then run `make check` before handing off if the change is not documentation-only.
- Keep README verification notes in sync when commands, fixtures, or supported toolchains change.

## PR / change guidance

- Keep diffs focused on the requested repository and avoid unrelated modernization or formatting churn.
- Preserve public APIs, sample behavior, file formats, and documented environment variables unless the task explicitly changes them.
- Update tests, README notes, or docs/plans when behavior, security posture, or validation commands change.
- Call out skipped platform validation, legacy toolchain assumptions, and any risky files touched in the final summary.

## Safety and gotchas

- Detected references to OpenAI. Keep API keys, OAuth credentials, tokens, and account-specific values in local configuration only.
- API routes validate Poe bot names before building upstream Poe URLs or model request payloads.
- API routes trim required user input and reject blank API keys and prompts before making Poe requests.
- Blank bot descriptions are treated as missing before description scoring.
- Chunked analysis rejects invalid chunked analysis indexes before creating progress streams.
- Chunked analysis rejects invalid chunked analysis session IDs before creating progress streams.
- Terminal streamed completion cancels the response reader and always releases its lock.
- Full analysis loads bundled test-file fixtures from the incoming request's same origin; do not restore a fixed development host or port.

## Agent workflow

1. Inspect the README, Makefile, manifests, and the files directly related to the request.
2. Make the smallest source or docs change that satisfies the task; avoid generated, vendored, or local-environment files unless required.
3. Run the narrowest useful validation first, then `make check` or the documented package/platform gate when available.
4. If a required SDK, service credential, or external runtime is unavailable, record the skipped command and why.
5. Summarize changed files, commands run, and remaining risks or follow-up validation.
