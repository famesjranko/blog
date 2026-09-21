.PHONY: install check typecheck lint guard format format-check test build images images-check preview preview-wsl clean help

PORT ?= 8000
# Preview builds include draft pieces; DRAFTS=false previews the published shape.
DRAFTS ?= true

help: ## Show targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed 's/: [^#]*## /: ## /' | sort | awk 'BEGIN {FS=": ## "} {printf "%-12s %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

check: ## Canonical gate (same as CI): format-check + lint + guard + typecheck + test + images-check + build
	$(MAKE) --no-print-directory format-check
	$(MAKE) --no-print-directory lint
	$(MAKE) --no-print-directory guard
	$(MAKE) --no-print-directory typecheck
	$(MAKE) --no-print-directory test
	$(MAKE) --no-print-directory images-check
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

images: ## Regenerate WebP sidecars for JPEGs under static/img
	npm run images

images-check: ## Fail when a JPEG lacks its required WebP sidecar (no conversion)
	npm run images:check

preview: ## Build and serve dist/ locally at http://localhost:8000 (PORT=8001, DRAFTS=false to override)
	SHOW_DRAFTS=$(DRAFTS) npm run build
	@echo "Preview at http://localhost:$(PORT)/ (DRAFTS=$(DRAFTS))"
	python3 -m http.server $(PORT) -d dist

preview-wsl: ## Build and serve dist/ on all WSL interfaces for LAN access (PORT=8001, DRAFTS=false to override)
	SHOW_DRAFTS=$(DRAFTS) npm run build
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$$(wslpath -w scripts/preview-wsl.ps1)" -Port $(PORT)
	@echo "Preview on all interfaces at port $(PORT) (DRAFTS=$(DRAFTS))"
	python3 -m http.server $(PORT) --bind 0.0.0.0 -d dist

clean: ## Remove build output
	rm -rf dist
