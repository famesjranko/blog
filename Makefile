.PHONY: install check typecheck lint guard format format-check test build clean help

help: ## Show targets
	@grep -E '^[a-z-]+: ## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS=": ## "} {printf "%-12s %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

check: ## Canonical gate (same as CI): format-check + lint + guard + typecheck + test + build
	./check.sh

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

clean: ## Remove build output
	rm -rf dist
