#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
README="$ROOT_DIR/README.md"
MAKEFILE="$ROOT_DIR/Makefile"
PACKAGE_JSON="$ROOT_DIR/package.json"
GITIGNORE="$ROOT_DIR/.gitignore"
DOCS_PLANS="$ROOT_DIR/docs/plans"
CI_WORKFLOW="$ROOT_DIR/.github/workflows/check.yml"

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
  "scripts/check-baseline.sh"; do
  require_file "$path"
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

if ! grep -Fq "scripts/check-baseline.sh" "$MAKEFILE"; then
  printf '%s\n' "Makefile must run scripts/check-baseline.sh from make check." >&2
  exit 1
fi

for target in "lint:" "typecheck:" "test:" "build:" "audit:" "verify:" "check:"; do
  if ! grep -Fq "$target" "$MAKEFILE"; then
    printf '%s\n' "Makefile must expose the $target gate." >&2
    exit 1
  fi
done

for package_script in \
  '"lint": "eslint ."' \
  '"typecheck": "tsc --noEmit"' \
  '"test": "tsx scripts/test-analyze-bot.ts"' \
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

for request_contract in \
  "export const INVALID_JSON_BODY_ERROR = 'Request body must be a JSON object'" \
  "const body: unknown = await request.json()" \
  "typeof body !== 'object'" \
  "Array.isArray(body)"; do
  if ! grep -Fq "$request_contract" "$REQUEST_BODY"; then
    printf '%s\n' "request-body.ts must preserve the JSON-object boundary: $request_contract" >&2
    exit 1
  fi
done

for route in "$ANALYZE_ROUTE" "$STREAM_ROUTE" "$CHUNKED_ROUTE" "$TEST_BOT_ROUTE"; do
  if ! grep -Fq "parseJsonObject(request)" "$route" ||
    ! grep -Fq "INVALID_JSON_BODY_ERROR" "$route"; then
    printf '%s\n' "$route must reject invalid JSON bodies through the shared parser." >&2
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
  "fetchCalled"; do
  if ! grep -Fq "$test_contract" "$ROUTE_TESTS"; then
    printf '%s\n' "route tests must preserve the invalid JSON regression: $test_contract" >&2
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
