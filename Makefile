.PHONY: lint typecheck test build audit verify check

NPM ?= npm
override REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

lint:
	cd "$(REPO_ROOT)" && $(NPM) run lint

typecheck:
	cd "$(REPO_ROOT)" && $(NPM) run typecheck

test:
	cd "$(REPO_ROOT)" && $(NPM) test

build:
	cd "$(REPO_ROOT)" && $(NPM) run build

audit:
	cd "$(REPO_ROOT)" && $(NPM) run audit

verify:
	cd "$(REPO_ROOT)" && $(NPM) run verify

check: verify
	cd "$(REPO_ROOT)" && scripts/check-baseline.sh
