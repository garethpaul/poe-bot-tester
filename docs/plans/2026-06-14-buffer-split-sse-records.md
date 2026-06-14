# Buffer Split SSE Records

status: completed

## Problem

The chunked-analysis page decodes each `ReadableStream` chunk independently and
splits that chunk on newlines. Network chunk boundaries do not preserve SSE
record boundaries, so a `data:` JSON record split across reads is parsed as two
malformed fragments and silently lost. Dropped records can leave progress,
session, chunk-completion, or final completion state stale even when the server
stream succeeds.

## Scope

- Add a small browser-safe SSE data decoder that buffers incomplete lines across
  stream reads and emits complete JSON payloads in order.
- Flush a complete final `data:` line when the stream closes without a trailing
  newline, while retaining incomplete or malformed data as non-events.
- Replace page-local per-chunk splitting with the decoder without changing retry,
  session, next-chunk, progress, or completion behavior.
- Add deterministic tests for split JSON, multiple records, CRLF framing,
  malformed records, non-data fields, and final-line flushing.
- Extend the static baseline so removing the buffered parser or its split-record
  regression coverage fails verification.

## Out Of Scope

- Changing server-side SSE framing or event payloads.
- Changing retry counts, backoff timing, UI rendering, or analysis scoring.
- Adding browser automation for live Poe API calls.

## Implementation Units

1. **Buffered SSE decoder**
   - Files: `src/app/sse-data-decoder.ts`
   - Maintain undecoded text between pushes, normalize complete line endings,
     parse only `data:` JSON records, and expose an explicit end-of-stream flush.

2. **Chunked-analysis integration**
   - Files: `src/app/page.tsx`
   - Feed decoded text into the shared decoder and process emitted payloads through
     the existing session, chunk-completion, progress, and completion branches.

3. **Regression and verification contracts**
   - Files: `scripts/test-sse-data-decoder.ts`, `package.json`,
     `scripts/check-baseline.sh`
   - Cover arbitrary split boundaries and framing edge cases, and make the full
     package gate require the new regression suite and integration shape.

4. **Project evidence**
   - Files: `CHANGES.md`, `README.md`, `docs/plans/2026-06-14-buffer-split-sse-records.md`
   - Record the reliability boundary and replace this planned status with exact
     completed validation evidence after implementation.

## Validation

- Run the focused SSE decoder regression suite first.
- Run lint, typecheck, application tests, production build, dependency audit, and
  the repository static baseline through `make check`.
- Run `make check` through the absolute Makefile path from an external directory.
- Reject mutations that remove buffering, end-of-stream flushing, split-record
  coverage, page integration, or completed-plan evidence.
- Audit the exact diff, generated artifacts, and changed lines for credential-like
  material before committing only the intended paths.

## Risks

- A parser abstraction could accidentally reinterpret valid existing payloads;
  tests must prove ordering and payload identity across split and unsplit input.
- End-of-stream flushing must not turn genuinely incomplete JSON into an event.
- Live Poe availability and real browser streaming remain outside deterministic
  local validation.

## Work Completed

- Added a reusable stateful SSE data decoder that retains incomplete lines,
  accepts LF and CRLF framing, ignores malformed or non-data fields, and flushes
  a complete final data line at end of stream.
- Switched the chunked-analysis page to streaming `TextDecoder` operation and
  routed every decoded payload through the existing session, chunk, progress,
  completion, and retry behavior.
- Added character-boundary and byte-boundary regressions, including multibyte
  UTF-8 content, multiple records, malformed data, and final-line handling.
- Extended package, documentation, and static baseline contracts for the new
  decoder and page integration.

## Verification Completed

- The focused SSE decoder suite passed across every character and byte boundary.
- `npm test`, `npm run lint`, and `npm run typecheck` passed on Node 20.19.5.
- `npm run build` completed the Next.js 16.2.9 production build, and
  `npm run audit` reported zero vulnerabilities.
- `make check` passed from the repository root and through the absolute Makefile path from `/tmp`, including lint, typecheck, tests, build, audit, and static
  baseline verification.
- Six isolated hostile mutations were rejected for removing buffered state,
  streaming UTF-8 decoding, end-of-stream flushing, split-record coverage,
  package test wiring, or completed plan status.
- Browser automation was not run because the required `agent-browser` CLI is not
  installed; deterministic character- and byte-split tests cover the changed
  parser boundary without live Poe credentials.
- `git diff --check`, intended-path, generated-artifact, and changed-line
  credential-pattern audits completed without findings.
