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
  "package.json" \
  "package-lock.json" \
  "scripts/test-analyze-bot.ts" \
  "src/app/api/analyze-bot-chunked/route.ts" \
  "docs/plans/2026-06-08-poe-bot-tester-check-wrapper.md" \
  "docs/plans/2026-06-10-ci-baseline.md" \
  "docs/plans/2026-06-09-scripted-baseline-check.md" \
  "scripts/check-baseline.sh"; do
  require_file "$path"
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

for documented in "npm test" "make check" "scripts/check-baseline.sh"; do
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
  if ! grep -iq "status" "$plan" || ! grep -iq "completed" "$plan"; then
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
  "$DOCS_PLANS/2026-06-09-scripted-baseline-check.md"; do
  if ! grep -Fq "make check" "$plan"; then
    printf '%s\n' "$plan must document make check verification." >&2
    exit 1
  fi
done
