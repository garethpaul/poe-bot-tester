#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
README="$ROOT_DIR/README.md"
MAKEFILE="$ROOT_DIR/Makefile"
PACKAGE_JSON="$ROOT_DIR/package.json"
GITIGNORE="$ROOT_DIR/.gitignore"
DOCS_PLANS="$ROOT_DIR/docs/plans"
CI_WORKFLOW="$ROOT_DIR/.github/workflows/check.yml"
CHUNKED_ROUTE="$ROOT_DIR/src/app/api/analyze-bot-chunked/route.ts"
ANALYZE_BOT_TEST="$ROOT_DIR/scripts/test-analyze-bot.ts"
SESSION_BOT_BINDING_PLAN="$DOCS_PLANS/2026-06-15-chunk-session-bot-binding.md"
FAILED_SESSION_CLEANUP_PLAN="$DOCS_PLANS/2026-06-15-failed-stream-session-cleanup.md"
SESSION_OWNERSHIP_CLEANUP_PLAN="$DOCS_PLANS/2026-06-16-session-ownership-cleanup.md"
SESSION_CONCURRENCY_GUARD_PLAN="$DOCS_PLANS/2026-06-16-chunk-session-concurrency-guard.md"
SESSION_SEQUENCE_PLAN="$DOCS_PLANS/2026-06-17-chunk-session-sequence.md"

require_file() {
  path=$1
  if [ ! -f "$ROOT_DIR/$path" ]; then
    printf '%s\n' "Required file is missing: $path" >&2
    exit 1
  fi
}

for path in \
  ".gitignore" \
  ".github/CODEOWNERS" \
  ".github/workflows/check.yml" \
  "CHANGES.md" \
  "Makefile" \
  "README.md" \
  "SECURITY.md" \
  "VISION.md" \
  "eslint.config.mjs" \
  "package.json" \
  "package-lock.json" \
  "tsconfig.json" \
  "scripts/test-analyze-bot.ts" \
  "scripts/test-sse-data-decoder.ts" \
  "src/app/sse-data-decoder.ts" \
  "src/app/api/request-body.ts" \
  "src/app/api/analyze-bot-chunked/route.ts" \
  "src/app/api/analyze-bot-stream/route.ts" \
  "src/app/api/analyze-bot-stream/bot-analyzer.ts" \
  "src/app/api/analyze-bot/route.ts" \
  "src/app/api/analyze-bot/scoring.ts" \
  "src/app/api/test-bot/route.ts" \
  "docs/plans/2026-06-08-poe-bot-tester-check-wrapper.md" \
  "docs/plans/2026-06-10-ci-baseline.md" \
  "docs/plans/2026-06-09-scripted-baseline-check.md" \
  "docs/plans/2026-06-10-hosted-next-validation.md" \
  "docs/plans/2026-06-10-poe-bot-tester-transport-errors.md" \
  "docs/plans/2026-06-12-poe-metadata-fetch-timeout.md" \
  "docs/plans/2026-06-12-next-16-toolchain.md" \
  "docs/plans/2026-06-13-malformed-json-request-bodies.md" \
  "docs/plans/2026-06-13-json-request-body-limit.md" \
  "docs/plans/2026-06-13-score-aggregation.md" \
  "docs/plans/2026-06-14-location-independent-make.md" \
  "docs/plans/2026-06-14-buffer-split-sse-records.md" \
  "docs/plans/2026-06-15-failed-stream-session-cleanup.md" \
  "docs/plans/2026-06-16-session-ownership-cleanup.md" \
  "docs/plans/2026-06-16-chunk-session-concurrency-guard.md" \
  "docs/plans/2026-06-17-chunk-session-sequence.md" \
  "scripts/check-baseline.sh"; do
  require_file "$path"
done

for cleanup_contract in \
  'function releaseSession' \
  'sessions.get(sessionId) === sessionData' \
  'releaseSession(sessionId, sessionData);'; do
  if ! grep -Fq "$cleanup_contract" "$CHUNKED_ROUTE"; then
    printf '%s\n' "Failed chunk streams must release their exact session: $cleanup_contract" >&2
    exit 1
  fi
done

if [ "$(grep -Fc 'sessions.set(sessionId, sessionData);' "$CHUNKED_ROUTE")" -ne 1 ]; then
  printf '%s\n' 'Chunk processing must not write an acquired session back after ownership can change.' >&2
  exit 1
fi

if [ "$(grep -Fc 'releaseSession(sessionId, sessionData);' "$CHUNKED_ROUTE")" -ne 3 ]; then
  printf '%s\n' 'Invalid starts, failed chunks, and successful terminal chunks must release their exact acquired session.' >&2
  exit 1
fi

if ! sed -n "/type: 'complete'/,/^  } else {/p" "$CHUNKED_ROUTE" | grep -Fq 'releaseSession(sessionId, sessionData);'; then
  printf '%s\n' 'Successful final chunk cleanup must release the exact acquired session.' >&2
  exit 1
fi

for document in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fqi 'exact-session ownership' "$document"; then
    printf '%s\n' "$document must document exact-session ownership for terminal cleanup." >&2
    exit 1
  fi
done

for evidence in \
  'Status: Completed' \
  'stale acquired session' \
  'Node 20' \
  'Node 24' \
  'make check' \
  'isolated hostile mutations were rejected' \
  'git diff --check'; do
  if ! grep -Fq "$evidence" "$SESSION_OWNERSHIP_CLEANUP_PLAN"; then
    printf '%s\n' "Session ownership cleanup plan must preserve completed evidence: $evidence" >&2
    exit 1
  fi
done

for test_contract in \
  'chunkedRouteSource.match(/sessions\.set' \
  'chunkedRouteSource.match(/releaseSession' \
  "/type: 'complete'[\s\S]*releaseSession" \
  'sessionOwnershipCleanupPlan'; do
  if ! grep -Fq "$test_contract" "$ANALYZE_BOT_TEST"; then
    printf '%s\n' "Route tests must preserve exact-session ownership coverage: $test_contract" >&2
    exit 1
  fi
done

for route_contract in \
  'function acquireSessionLease' \
  'if (sessionData.activeLease) return null' \
  'function releaseSessionLease' \
  'sessionData.activeLease === lease' \
  'return NextResponse.json({ error: SESSION_IN_PROGRESS_ERROR }, { status: 409 });' \
  'releaseSessionLease(sessionData, sessionLease);'; do
  if ! grep -Fq "$route_contract" "$CHUNKED_ROUTE"; then
    printf '%s\n' "Concurrent chunk sessions must retain their lease contract: $route_contract" >&2
    exit 1
  fi
done

for test_contract in \
  'async function runChunkSessionConcurrencyAssertion()' \
  'assert.equal(overlappingResponse.status, 409);' \
  'error: SESSION_IN_PROGRESS_ERROR' \
  'assert.equal(sequentialResponse.status, 200);' \
  'await runChunkSessionConcurrencyAssertion();'; do
  if ! grep -Fq "$test_contract" "$ANALYZE_BOT_TEST"; then
    printf '%s\n' "Concurrent chunk session tests must retain their regression contract: $test_contract" >&2
    exit 1
  fi
done

for document in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fqi 'exact in-flight lease' "$document"; then
    printf '%s\n' "$document must document exact in-flight chunk-session leases." >&2
    exit 1
  fi
done

for plan_contract in \
  'Status: Completed' \
  'HTTP 409' \
  'exact request lease' \
  'isolated hostile mutations were rejected' \
  'make check'; do
  if ! grep -Fqi "$plan_contract" "$SESSION_CONCURRENCY_GUARD_PLAN"; then
    printf '%s\n' "Chunk session concurrency plan must retain completed evidence: $plan_contract" >&2
    exit 1
  fi
done

for sequence_contract in \
  "export const SESSION_CHUNK_SEQUENCE_ERROR = 'Chunk session must start at chunk 0 and continue in order'" \
  'nextChunk: number;' \
  'nextChunk: 0,' \
  'const sessionExisted = sessions.has(sessionId);' \
  'if (sessionData.activeLease)' \
  'if (chunk !== sessionData.nextChunk)' \
  'if (!sessionExisted) releaseSession(sessionId, sessionData);' \
  'sessionData.nextChunk = chunkIndex + 1;'; do
  if ! grep -Fq "$sequence_contract" "$CHUNKED_ROUTE"; then
    printf '%s\n' "Chunk sessions must preserve exact sequence contract: $sequence_contract" >&2
    exit 1
  fi
done

active_line=$(grep -nF 'if (sessionData.activeLease)' "$CHUNKED_ROUTE" | tail -1 | cut -d: -f1)
sequence_line=$(grep -nF 'if (chunk !== sessionData.nextChunk)' "$CHUNKED_ROUTE" | cut -d: -f1)
lease_line=$(grep -nF 'const sessionLease = acquireSessionLease(sessionData);' "$CHUNKED_ROUTE" | cut -d: -f1)
if [ -z "$active_line" ] || [ -z "$sequence_line" ] || [ -z "$lease_line" ] || \
   [ "$active_line" -ge "$sequence_line" ] || [ "$sequence_line" -ge "$lease_line" ]; then
  printf '%s\n' 'Chunk requests must preserve overlap errors, then validate sequence before lease acquisition.' >&2
  exit 1
fi

for sequence_test_contract in \
  'async function runChunkSessionSequenceAssertion()' \
  'await runChunkSessionSequenceAssertion();' \
  "const sessionId = 'ordered-chunk-session'" \
  'for (const chunk of [0, 2])' \
  'error: SESSION_CHUNK_SEQUENCE_ERROR' \
  'assert.equal(fetchCount, 0)' \
  'assert.equal(fetchCount, 1)'; do
  if ! grep -Fq "$sequence_test_contract" "$ANALYZE_BOT_TEST"; then
    printf '%s\n' "Chunk sequence tests must preserve regression contract: $sequence_test_contract" >&2
    exit 1
  fi
done

if [ "$(grep -Fc 'runChunkSessionSequenceAssertion' "$ANALYZE_BOT_TEST")" -ne 2 ]; then
  printf '%s\n' 'Chunk sequence regression must retain one definition and one invocation.' >&2
  exit 1
fi

for document in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fiq 'exact chunk sequence' "$document"; then
    printf '%s\n' "$document must document exact chunk sequence validation." >&2
    exit 1
  fi
done

for sequence_plan_contract in \
  'status: completed' \
  'Node 20' \
  'Node 24' \
  'npm run verify' \
  'external working directory' \
  'Seven isolated hostile mutations were rejected' \
  'git diff --check'; do
  if ! grep -Fq "$sequence_plan_contract" "$SESSION_SEQUENCE_PLAN"; then
    printf '%s\n' "Chunk sequence plan must retain completed evidence: $sequence_plan_contract" >&2
    exit 1
  fi
done

cleanup_line=$(grep -nF 'releaseSession(sessionId, sessionData);' "$CHUNKED_ROUTE" | tail -1 | cut -d: -f1)
error_line=$(grep -nF 'await sendProgress(controller, {' "$CHUNKED_ROUTE" | tail -1 | cut -d: -f1)
if [ -z "$cleanup_line" ] || [ -z "$error_line" ] || [ "$cleanup_line" -ge "$error_line" ]; then
  printf '%s\n' 'Failed chunk session cleanup must precede terminal SSE error emission.' >&2
  exit 1
fi

for cleanup_test_contract in \
  'async function runFailedChunkSessionCleanupAssertion()' \
  "class FailingTextEncoder" \
  "botName: 'AnotherBot'" \
  'assert.match(await reusedResponse.text(), /"type":"chunk_complete"/);' \
  'await runFailedChunkSessionCleanupAssertion();'; do
  if ! grep -Fq "$cleanup_test_contract" "$ANALYZE_BOT_TEST"; then
    printf '%s\n' "Failed chunk session cleanup must retain its regression contract: $cleanup_test_contract" >&2
    exit 1
  fi
done

for cleanup_plan_contract in \
  'Status: Completed' \
  'terminal stream failure' \
  'isolated hostile mutations were rejected' \
  'make check'; do
  if ! grep -Fqi "$cleanup_plan_contract" "$FAILED_SESSION_CLEANUP_PLAN"; then
    printf '%s\n' "Failed stream session cleanup plan must retain completed evidence: $cleanup_plan_contract" >&2
    exit 1
  fi
done

for cleanup_doc in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fiq 'terminal chunk stream failure' "$cleanup_doc"; then
    printf '%s\n' "Failed stream session cleanup guidance is missing from $cleanup_doc" >&2
    exit 1
  fi
done

for route_contract in \
  'function acquireSession' \
  'existingSession.botName === botName ? existingSession : null' \
  'const sessionData = acquireSession(sessionId, botName);' \
  'return NextResponse.json({ error: SESSION_BOT_MISMATCH_ERROR }, { status: 409 });' \
  'await processChunk(botName, apiKey, chunk, sessionId, sessionData, controller);'; do
  if ! grep -Fq "$route_contract" "$CHUNKED_ROUTE"; then
    printf '%s\n' "Chunk sessions must remain bound to their originating bot: $route_contract" >&2
    exit 1
  fi
done

acquire_line=$(grep -nF 'const sessionData = acquireSession(sessionId, botName);' "$CHUNKED_ROUTE" | cut -d: -f1)
stream_line=$(grep -nF 'const stream = new ReadableStream({' "$CHUNKED_ROUTE" | cut -d: -f1)
if [ -z "$acquire_line" ] || [ -z "$stream_line" ] || [ "$acquire_line" -ge "$stream_line" ]; then
  printf '%s\n' 'Chunk sessions must be acquired before SSE stream construction.' >&2
  exit 1
fi

for test_contract in \
  'async function runChunkSessionBotBindingAssertion()' \
  'assert.equal(mismatchedResponse.status, 409);' \
  'assert.equal(fetchCount, 1);' \
  'await runChunkSessionBotBindingAssertion();'; do
  if ! grep -Fq "$test_contract" "$ANALYZE_BOT_TEST"; then
    printf '%s\n' "Chunk session bot binding must retain its regression contract: $test_contract" >&2
    exit 1
  fi
done

for plan_contract in \
  'Status: Completed' \
  '## Verification' \
  'cross-bot conflict' \
  'hostile mutations' \
  'make check'; do
  if ! grep -Fqi "$plan_contract" "$SESSION_BOT_BINDING_PLAN"; then
    printf '%s\n' "Chunk session bot binding plan must retain completed evidence: $plan_contract" >&2
    exit 1
  fi
done

for evidence in \
  'status: completed' \
  'Node 20.19.5' \
  'Node 24.16.0' \
  'absolute Makefile path from /tmp' \
  'REPO_ROOT=/tmp' \
  'eight isolated hostile mutations' \
  'git diff --check' \
  'credential-pattern'; do
  if ! grep -Fq "$evidence" "$DOCS_PLANS/2026-06-14-location-independent-make.md"; then
    printf '%s\n' "Location-independent Make plan must preserve evidence: $evidence" >&2
    exit 1
  fi
done

for evidence in \
  'status: completed' \
  'every character and byte boundary' \
  'Next.js 16.2.9 production build' \
  'zero vulnerabilities' \
  'absolute Makefile path from `/tmp`' \
  'Six isolated hostile mutations were rejected' \
  '`git diff --check`' \
  'credential-pattern audits completed without findings'; do
  if ! grep -Fq "$evidence" "$DOCS_PLANS/2026-06-14-buffer-split-sse-records.md"; then
    printf '%s\n' "Buffered SSE plan must preserve completed evidence: $evidence" >&2
    exit 1
  fi
done

for framework_contract in \
  '"next": "16.2.9"' \
  '"react": "^19.2.7"' \
  '"react-dom": "^19.2.7"' \
  '"eslint": "^9.39.4"' \
  '"eslint-config-next": "16.2.9"' \
  '"typescript": "^5.9.3"'; do
  if ! grep -Fq "$framework_contract" "$PACKAGE_JSON"; then
    printf '%s\n' "package.json must preserve the reviewed Next 16 toolchain: $framework_contract" >&2
    exit 1
  fi
done

if ! node -e 'const lock = require(process.argv[1]); process.exit(lock.packages?.["node_modules/esbuild"]?.version === "0.28.1" ? 0 : 1)' "$ROOT_DIR/package-lock.json"; then
  printf '%s\n' "package-lock.json must preserve the reviewed esbuild 0.28.1 security fix." >&2
  exit 1
fi

if grep -Fq '"@eslint/eslintrc"' "$PACKAGE_JSON"; then
  printf '%s\n' "package.json must not restore the obsolete direct FlatCompat dependency." >&2
  exit 1
fi

for eslint_contract in \
  'from "eslint/config"' \
  'from "eslint-config-next/core-web-vitals"' \
  'from "eslint-config-next/typescript"' \
  '...nextVitals' \
  '...nextTypescript'; do
  if ! grep -Fq "$eslint_contract" "$ROOT_DIR/eslint.config.mjs"; then
    printf '%s\n' "eslint.config.mjs must preserve the native Next 16 flat config: $eslint_contract" >&2
    exit 1
  fi
done

for typescript_contract in \
  '"jsx": "react-jsx"' \
  '".next/dev/types/**/*.ts"'; do
  if ! grep -Fq "$typescript_contract" "$ROOT_DIR/tsconfig.json"; then
    printf '%s\n' "tsconfig.json must preserve the Next 16 setting: $typescript_contract" >&2
    exit 1
  fi
done

for workflow_value in \
  "permissions:" \
  "contents: read" \
  "cancel-in-progress: true" \
  "runs-on: ubuntu-24.04" \
  "timeout-minutes: 15" \
  "actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10" \
  "persist-credentials: false" \
  "actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e" \
  "node-version: [20, 24]" \
  "POE_API_KEY: \"\"" \
  "run: npm ci" \
  "run: make check"; do
  if ! grep -Fq "$workflow_value" "$CI_WORKFLOW"; then
    printf '%s\n' "GitHub Actions workflow must include: $workflow_value" >&2
    exit 1
  fi
done

if [ "$(grep -Ec '^[[:space:]]*- uses: actions/checkout@' "$CI_WORKFLOW")" -ne 1 ] ||
  [ "$(grep -Ec '^[[:space:]]*- uses: actions/setup-node@' "$CI_WORKFLOW")" -ne 1 ] ||
  [ "$(grep -Fc 'persist-credentials:' "$CI_WORKFLOW")" -ne 1 ] ||
  [ "$(grep -Fc 'permissions:' "$CI_WORKFLOW")" -ne 1 ]; then
  printf '%s\n' "GitHub Actions workflow must keep singular action and credential policy entries." >&2
  exit 1
fi

if grep -Eq '^[[:space:]]+[[:alnum:]_-]+:[[:space:]]+write[[:space:]]*$' "$CI_WORKFLOW"; then
  printf '%s\n' "GitHub Actions workflow must not grant write permissions." >&2
  exit 1
fi

workflow_files=$(find "$ROOT_DIR/.github/workflows" -type f -print | sort)
if [ "$workflow_files" != "$CI_WORKFLOW" ]; then
  printf '%s\n' "check.yml must be the repository's only hosted workflow." >&2
  exit 1
fi

if [ "$(tr -d '\r' < "$ROOT_DIR/.github/CODEOWNERS")" != "* @garethpaul" ]; then
  printf '%s\n' "CODEOWNERS must assign the repository to @garethpaul." >&2
  exit 1
fi

for target in "lint:" "typecheck:" "test:" "build:" "audit:" "verify:" "check:"; do
  if ! grep -Fq "$target" "$MAKEFILE"; then
    printf '%s\n' "Makefile must expose the $target gate." >&2
    exit 1
  fi
done

for make_contract in \
  'override REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))' \
  'cd "$(REPO_ROOT)" && $(NPM) run lint' \
  'cd "$(REPO_ROOT)" && $(NPM) run typecheck' \
  'cd "$(REPO_ROOT)" && $(NPM) test' \
  'cd "$(REPO_ROOT)" && $(NPM) run build' \
  'cd "$(REPO_ROOT)" && $(NPM) run audit' \
  'cd "$(REPO_ROOT)" && $(NPM) run verify' \
  'cd "$(REPO_ROOT)" && scripts/check-baseline.sh'; do
  if ! grep -Fq "$make_contract" "$MAKEFILE"; then
    printf '%s\n' "Makefile must remain caller-directory independent: $make_contract" >&2
    exit 1
  fi
done

for package_script in \
  '"lint": "eslint ."' \
  '"typecheck": "tsc --noEmit"' \
  '"test": "tsx scripts/test-analyze-bot.ts && tsx scripts/test-sse-data-decoder.ts && tsx scripts/test-sse-stream-consumer.ts"' \
  '"audit": "npm audit --audit-level=moderate"' \
  '"verify": "npm run lint && npm run typecheck && npm test && npm run build && npm run audit"'; do
  if ! grep -Fq "$package_script" "$PACKAGE_JSON"; then
    printf '%s\n' "package.json must keep script baseline: $package_script" >&2
    exit 1
  fi
done

for cleanup in "tsconfig.tsbuildinfo" "['.next','tsconfig.tsbuildinfo']"; do
  if ! grep -Fq "$cleanup" "$PACKAGE_JSON"; then
    printf '%s\n' "package.json must keep generated-cache cleanup: $cleanup" >&2
    exit 1
  fi
done

for documented in "npm test" "make check" "Poe transport errors" "five-second abort boundary" "Next.js 16.2.9" "native flat ESLint" "scripts/check-baseline.sh" "hosted Linux"; do
  if ! grep -Fq "$documented" "$README"; then
    printf '%s\n' "README must document $documented." >&2
    exit 1
  fi
done

if ! grep -Fq "GitHub Actions" "$README" ||
  ! grep -Fq "docs/plans/2026-06-10-ci-baseline.md" "$README" ||
  ! grep -Fq "GitHub Actions" "$ROOT_DIR/VISION.md" ||
  ! grep -Fq "GitHub Actions" "$ROOT_DIR/SECURITY.md" ||
  ! grep -Fq "GitHub Actions" "$ROOT_DIR/CHANGES.md"; then
  printf '%s\n' "Project docs must record the GitHub Actions CI baseline." >&2
  exit 1
fi

SCORING="$ROOT_DIR/src/app/api/analyze-bot/scoring.ts"
ANALYZE_ROUTE="$ROOT_DIR/src/app/api/analyze-bot/route.ts"
STREAM_ANALYZER="$ROOT_DIR/src/app/api/analyze-bot-stream/bot-analyzer.ts"
CHUNKED_ROUTE="$ROOT_DIR/src/app/api/analyze-bot-chunked/route.ts"
STREAM_ROUTE="$ROOT_DIR/src/app/api/analyze-bot-stream/route.ts"
TEST_BOT_ROUTE="$ROOT_DIR/src/app/api/test-bot/route.ts"
REQUEST_BODY="$ROOT_DIR/src/app/api/request-body.ts"
ROUTE_TESTS="$ROOT_DIR/scripts/test-analyze-bot.ts"
PAGE="$ROOT_DIR/src/app/page.tsx"
SSE_DECODER="$ROOT_DIR/src/app/sse-data-decoder.ts"
SSE_TESTS="$ROOT_DIR/scripts/test-sse-data-decoder.ts"
SSE_CONSUMER="$ROOT_DIR/src/app/sse-stream-consumer.ts"
SSE_CONSUMER_TESTS="$ROOT_DIR/scripts/test-sse-stream-consumer.ts"
SSE_CONSUMER_PLAN="$ROOT_DIR/docs/plans/2026-06-15-terminal-sse-reader-cleanup.md"

for decoder_contract in \
  "export class SseDataDecoder" \
  "private bufferedLine = ''" \
  'this.bufferedLine.split(/\r?\n/)' \
  "finish(): T[]" \
  "line.startsWith('data:')" \
  "JSON.parse(encoded)" \
  "typeof parsed !== 'object'" \
  "Array.isArray(parsed)"; do
  if ! grep -Fq "$decoder_contract" "$SSE_DECODER"; then
    printf '%s\n' "SSE decoder must preserve buffered record parsing: $decoder_contract" >&2
    exit 1
  fi
done

for page_contract in \
  "import { consumeSseStream } from './sse-stream-consumer'" \
  "if (await consumeSseStream<ProgressUpdate>(reader, processUpdate)) return;"; do
  if ! grep -Fq "$page_contract" "$PAGE"; then
    printf '%s\n' "page.tsx must preserve buffered SSE integration: $page_contract" >&2
    exit 1
  fi
done

for consumer_contract in \
  'export async function consumeSseStream<T extends object>' \
  'await reader.cancel()' \
  'const completed = await processUpdates(finalUpdates)' \
  'reader.releaseLock()'; do
  if ! grep -Fq "$consumer_contract" "$SSE_CONSUMER"; then
    printf '%s\n' "SSE consumer must preserve terminal reader cleanup: $consumer_contract" >&2
    exit 1
  fi
done

for consumer_test_contract in \
  "terminalUpdates, ['progress', 'complete']" \
  'assert.equal(terminalReader.readCalls, 1)' \
  'assert.equal(terminalReader.cancelCalls, 1)' \
  "assert.deepEqual(terminalReader.events, ['cancel', 'release'])" \
  'assert.equal(eofReader.cancelCalls, 0)' \
  'assert.equal(cancelFailureReader.releaseCalls, 1)' \
  'assert.equal(readFailureReader.releaseCalls, 1)' \
  'assert.equal(callbackFailureReader.releaseCalls, 1)'; do
  if ! grep -Fq "$consumer_test_contract" "$SSE_CONSUMER_TESTS"; then
    printf '%s\n' "SSE consumer tests must preserve reader lifecycle coverage: $consumer_test_contract" >&2
    exit 1
  fi
done

if ! grep -Fq 'tsx scripts/test-sse-stream-consumer.ts' "$ROOT_DIR/package.json"; then
  printf '%s\n' "Package test gate must execute the SSE consumer lifecycle suite." >&2
  exit 1
fi

for consumer_doc in "$ROOT_DIR/AGENTS.md" "$ROOT_DIR/README.md" \
  "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! tr '\n' ' ' < "$consumer_doc" | tr -s '[:space:]' ' ' | \
      grep -Fq "Terminal streamed completion cancels the response reader and always releases its lock."; then
    printf '%s\n' "$consumer_doc must document terminal reader cleanup." >&2
    exit 1
  fi
done

for consumer_plan_contract in \
  'Status: Completed' \
  '## Verification: Completed' \
  'make check' \
  'hostile mutations' \
  'no browser execution is claimed'; do
  if ! grep -Fq "$consumer_plan_contract" "$SSE_CONSUMER_PLAN"; then
    printf '%s\n' "SSE consumer plan must record completed verification: $consumer_plan_contract" >&2
    exit 1
  fi
done

for test_contract in \
  "for (let split = 1; split < record.length; split += 1)" \
  "new TextEncoder().encode(record)" \
  "event: progress\\r\\ndata:" \
  'data: null\ndata: "text"\ndata: []' \
  "trailing.finish()" \
  "incomplete.finish()"; do
  if ! grep -Fq "$test_contract" "$SSE_TESTS"; then
    printf '%s\n' "SSE decoder tests must preserve split-record coverage: $test_contract" >&2
    exit 1
  fi
done

for scoring_contract in \
  "export function calculateOverallScore" \
  "if (results.length === 0) return 0" \
  "Number.isFinite(score)" \
  "return Math.round(total / results.length)"; do
  if ! grep -Fq "$scoring_contract" "$SCORING"; then
    printf '%s\n' "scoring.ts must preserve score aggregation: $scoring_contract" >&2
    exit 1
  fi
done

for consumer in "$ANALYZE_ROUTE" "$STREAM_ANALYZER" "$CHUNKED_ROUTE"; do
  if ! grep -Fq "calculateOverallScore(allResults)" "$consumer"; then
    printf '%s\n' "$consumer must use the shared score aggregator." >&2
    exit 1
  fi
done

for score_test in \
  "calculateOverallScore([]), 0" \
  "{ score: 80 }, { score: 81 }" \
  "{ score: 100 }, {}, { score: 50 }" \
  "Number.POSITIVE_INFINITY" \
  "{ score: -10 }, { score: 130 }"; do
  if ! grep -Fq "$score_test" "$ROUTE_TESTS"; then
    printf '%s\n' "score aggregation tests must preserve: $score_test" >&2
    exit 1
  fi
done

for document in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fq "score aggregation" "$document"; then
    printf '%s\n' "$document must document score aggregation." >&2
    exit 1
  fi
done

for evidence in \
  "status: completed" \
  "Node 20" \
  "Node 24" \
  "make check" \
  "hostile mutations" \
  "git diff --check"; do
  if ! grep -Fq "$evidence" "$DOCS_PLANS/2026-06-13-score-aggregation.md"; then
    printf '%s\n' "score aggregation plan must preserve completed evidence: $evidence" >&2
    exit 1
  fi
done

for request_contract in \
  "export const INVALID_JSON_BODY_ERROR = 'Request body must be a JSON object'" \
  "export const JSON_BODY_TOO_LARGE_ERROR = 'Request body is too large'" \
  "export const MAX_JSON_BODY_BYTES = 64 * 1024" \
  "headers.get('content-length')" \
  "BigInt(contentLength) > BigInt(MAX_JSON_BODY_BYTES)" \
  "request.body.getReader()" \
  "totalBytes += value.byteLength" \
  "totalBytes > MAX_JSON_BODY_BYTES" \
  "reader.cancel()" \
  "new TextDecoder('utf-8', { fatal: true })" \
  "JSON.parse" \
  "typeof body !== 'object'" \
  "Array.isArray(body)"; do
  if ! grep -Fq "$request_contract" "$REQUEST_BODY"; then
    printf '%s\n' "request-body.ts must preserve the JSON-object boundary: $request_contract" >&2
    exit 1
  fi
done

if grep -Fq "request.json()" "$REQUEST_BODY"; then
  printf '%s\n' "request-body.ts must enforce the byte limit before JSON parsing." >&2
  exit 1
fi

for route in "$ANALYZE_ROUTE" "$STREAM_ROUTE" "$CHUNKED_ROUTE" "$TEST_BOT_ROUTE"; do
  if ! grep -Fq "parseJsonObject(request)" "$route" ||
    ! grep -Fq "INVALID_JSON_BODY_ERROR" "$route" ||
    ! grep -Fq "JSON_BODY_TOO_LARGE_ERROR" "$route" ||
    ! grep -Fq "status: oversized ? 413 : 400" "$route"; then
    printf '%s\n' "$route must reject invalid and oversized JSON bodies through the shared parser." >&2
    exit 1
  fi
done

for test_contract in \
  "malformedJsonRequest" \
  "const analyzeMalformedJson = await" \
  "const testBotMalformedJson = await" \
  "const streamMalformedJson = await" \
  "const chunkedMalformedJson = await" \
  "const analyzeArrayBody = await" \
  "declaredOversizedRequest" \
  "extremelyLargeDeclaredRequest" \
  "streamCancelled" \
  "const failingStream = new ReadableStream" \
  "MAX_JSON_BODY_BYTES - 12" \
  "const analyzeOversized = await" \
  "const testBotOversized = await" \
  "const streamOversized = await" \
  "const chunkedOversized = await" \
  "fetchCalled"; do
  if ! grep -Fq "$test_contract" "$ROUTE_TESTS"; then
    printf '%s\n' "route tests must preserve the invalid JSON regression: $test_contract" >&2
    exit 1
  fi
done

for document in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fq "64 KiB JSON request body limit" "$document"; then
    printf '%s\n' "$document must document the 64 KiB JSON request body limit." >&2
    exit 1
  fi
done

for evidence in \
  "status: completed" \
  "Node 20" \
  "Node 24" \
  "make check" \
  "hostile mutations rejected" \
  "64 KiB" \
  "stream cancellation" \
  "git diff --check" \
  "secret, captured-prompt, generated-artifact, and dependency-drift scan"; do
  if ! grep -Fq "$evidence" "$DOCS_PLANS/2026-06-13-json-request-body-limit.md"; then
    printf '%s\n' "JSON request body limit plan must preserve completed evidence: $evidence" >&2
    exit 1
  fi
done

for document in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fq "malformed and non-object JSON request bodies" "$document"; then
    printf '%s\n' "$document must document malformed and non-object JSON request bodies." >&2
    exit 1
  fi
done

for evidence in \
  "status: completed" \
  "Node 20" \
  "Node 24" \
  "esbuild 0.28.1" \
  "make check" \
  "hostile mutations rejected" \
  "protected runtime paths had only the intended request-boundary diff" \
  "git diff --check" \
  "secret, captured-prompt, generated-artifact, and dependency-drift scan"; do
  if ! grep -Fq "$evidence" "$DOCS_PLANS/2026-06-13-malformed-json-request-bodies.md"; then
    printf '%s\n' "malformed JSON plan must preserve completed evidence: $evidence" >&2
    exit 1
  fi
done

if ! grep -Fq "export const POE_METADATA_TIMEOUT_MS = 5000" "$SCORING"; then
  printf '%s\n' "scoring.ts must export the shared five-second Poe metadata timeout." >&2
  exit 1
fi

for analyzer in "$ANALYZE_ROUTE" "$STREAM_ANALYZER" "$CHUNKED_ROUTE"; do
  if ! grep -Fq "AbortSignal.timeout(POE_METADATA_TIMEOUT_MS)" "$analyzer"; then
    printf '%s\n' "$analyzer must apply the shared Poe metadata timeout." >&2
    exit 1
  fi
  if grep -Fq "AbortSignal.timeout(5000)" "$analyzer"; then
    printf '%s\n' "$analyzer must not define a route-local Poe metadata timeout." >&2
    exit 1
  fi
done

for document in "$README" "$ROOT_DIR/SECURITY.md" "$ROOT_DIR/VISION.md" "$ROOT_DIR/CHANGES.md"; do
  if ! grep -Fq "five-second" "$document"; then
    printf '%s\n' "$document must document the shared five-second metadata boundary." >&2
    exit 1
  fi
done

for ignored in "/node_modules" "/.next/" ".env*" ".vercel" "*.tsbuildinfo" ".idea/" ".vscode/" "*.iml"; do
  if ! grep -Fq "$ignored" "$GITIGNORE"; then
    printf '%s\n' ".gitignore must include $ignored" >&2
    exit 1
  fi
done

tracked_local=$(git -C "$ROOT_DIR" ls-files '.env' '.env.*' '.idea' '.vscode' '*.iml' || true)
if [ -n "$tracked_local" ]; then
  printf '%s\n%s\n' "Local secrets or editor metadata must not be tracked:" "$tracked_local" >&2
  exit 1
fi

found_plan=0
for plan in "$DOCS_PLANS"/*.md; do
  [ -e "$plan" ] || continue
  found_plan=1
  if [ "$(grep -Eic '^status: completed$' "$plan")" -ne 1 ]; then
    printf '%s\n' "$plan must record completed status." >&2
    exit 1
  fi
  if ! grep -Fq "## Verification" "$plan"; then
    printf '%s\n' "$plan must document verification." >&2
    exit 1
  fi
done

if [ "$found_plan" -eq 0 ]; then
  printf '%s\n' "docs/plans must contain completed markdown plans." >&2
  exit 1
fi

for plan in \
  "$DOCS_PLANS/2026-06-08-poe-bot-tester-check-wrapper.md" \
  "$DOCS_PLANS/2026-06-10-ci-baseline.md" \
  "$DOCS_PLANS/2026-06-09-scripted-baseline-check.md" \
  "$DOCS_PLANS/2026-06-10-hosted-next-validation.md"; do
  if ! grep -Fq "make check" "$plan"; then
    printf '%s\n' "$plan must document make check verification." >&2
    exit 1
  fi
done
