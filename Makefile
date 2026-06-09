.PHONY: lint typecheck test build audit verify check

NPM ?= npm

lint:
	$(NPM) run lint

typecheck:
	$(NPM) run typecheck

test:
	$(NPM) test

build:
	$(NPM) run build

audit:
	$(NPM) run audit

verify:
	$(NPM) run verify

check: verify
	scripts/check-baseline.sh
