.PHONY: install check typecheck lint guard format format-check test browser build images images-check preview preview-wsl clean help

PORT ?= 8000
# Preview builds include draft pieces; DRAFTS=false previews the published shape.
DRAFTS ?= true

help: ## Show targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed 's/: [^#]*## /: ## /' | sort | awk 'BEGIN {FS=": ## "} {printf "%-12s %s\n", $$1, $$2}'

install: ## Install dependencies and the repo git hooks
	npm ci
	npx playwright install chromium
	git config core.hooksPath scripts/hooks

check: ## Canonical gate (same as CI): format-check + lint + guard + typecheck + test + images-check + build + browser
	$(MAKE) --no-print-directory format-check
	$(MAKE) --no-print-directory lint
	$(MAKE) --no-print-directory guard
	$(MAKE) --no-print-directory typecheck
	$(MAKE) --no-print-directory test
	$(MAKE) --no-print-directory images-check
	$(MAKE) --no-print-directory build
	$(MAKE) --no-print-directory browser
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

browser: ## Playwright geometry checks against the local dist/ build
	npm run test:browser

build: ## Generate card placeholders and build dist/ (BASE_PATH=/repo for project-site URLs, empty locally)
	npm run build

images: ## Render placeholders, shrink oversized JPEGs, and regenerate the image size table
	npm run images

images-check: ## Fail when a placeholder is stale, a JPEG is oversized, or the size table is stale (no conversion)
	npm run images:check

preview: ## Build and serve dist/ at http://localhost:8000 and on the LAN (PORT=8001, DRAFTS=false to override)
	SHOW_DRAFTS=$(DRAFTS) npm run build
	@echo "Preview at http://localhost:$(PORT)/ (DRAFTS=$(DRAFTS))"
	python3 scripts/preview-server.py $(PORT)

preview-wsl: ## Build and serve dist/ on all WSL interfaces for LAN access (PORT=8001, DRAFTS=false to override)
	SHOW_DRAFTS=$(DRAFTS) npm run build
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$$(wslpath -w scripts/preview-wsl.ps1)" -Port $(PORT)
	@echo "Preview at http://localhost:$(PORT)/ and on the LAN (DRAFTS=$(DRAFTS))"
	python3 scripts/preview-server.py $(PORT)

clean: ## Remove build output
	rm -rf dist
