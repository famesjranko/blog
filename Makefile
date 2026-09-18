.PHONY: install check typecheck lint guard format format-check test build preview clean help

PORT ?= 8000

help: ## Show targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed 's/: [^#]*## /: ## /' | sort | awk 'BEGIN {FS=": ## "} {printf "%-12s %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

check: ## Canonical gate (same as CI): format-check + lint + guard + typecheck + test + build
	$(MAKE) --no-print-directory format-check
	$(MAKE) --no-print-directory lint
	$(MAKE) --no-print-directory guard
	$(MAKE) --no-print-directory typecheck
	$(MAKE) --no-print-directory test
	$(MAKE) --no-print-directory build
	echo "OK: all checks passed."

typecheck: ## tsc --noEmit
	npm run typecheck

lint: ## biome lint
	npm run lint

guard: ## structural budgets (LOC, params, classes, mutations, suppressions)
	npm run guard

format: ## Rewrite files with biome
	npm run format

format-check: ## Fail on unformatted files (CI)
	npm run format:check

test: ## vitest run
	npm run test

build: ## Build dist/ (BASE_PATH=/repo for project-site URLs, empty locally)
	npm run build

preview: build ## Serve dist/ locally at http://localhost:8000 (PORT=8001 to override)
	python3 -m http.server $(PORT) -d dist

clean: ## Remove build output
	rm -rf dist
