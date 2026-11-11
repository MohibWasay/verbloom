SHELL := /bin/bash
.DEFAULT_GOAL := help

GO_TAGS  ?= webkit2_41
FRONTEND := frontend
# Explicit list: ./... would also walk frontend/node_modules.
GO_PKGS  := . ./internal/...
NODE_MODULES := $(FRONTEND)/node_modules/.package-lock.json

.PHONY: help
help: ## List available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## ---------- setup ----------

.PHONY: install
install: $(NODE_MODULES) ## Install frontend dependencies (only when package-lock.json changed)

# npm writes node_modules/.package-lock.json on every install, so it is
# older than package-lock.json exactly when dependencies are out of date.
$(NODE_MODULES): $(FRONTEND)/package-lock.json
	cd $(FRONTEND) && npm ci --no-audit --no-fund
	@touch $@

$(FRONTEND)/dist/index.html:
	@mkdir -p $(FRONTEND)/dist && echo '<!doctype html>' > $@

## ---------- dev & build ----------

.PHONY: dev
dev: ## Run the app with hot reload
	wails dev -tags $(GO_TAGS)

.PHONY: build
build: ## Build the production binary into build/bin
	wails build -tags $(GO_TAGS) -clean

.PHONY: bindings
bindings: ## Regenerate frontend/wailsjs from the bound Go services
	wails generate module -tags $(GO_TAGS)

## ---------- quality ----------

.PHONY: fmt
fmt: $(NODE_MODULES) ## Format Go and TypeScript sources
	golangci-lint fmt
	cd $(FRONTEND) && npm run format

.PHONY: lint
lint: lint-go lint-web ## Lint Go and TypeScript

.PHONY: lint-go
lint-go: $(FRONTEND)/dist/index.html
	golangci-lint run $(GO_PKGS)

.PHONY: lint-web
lint-web: $(NODE_MODULES)
	cd $(FRONTEND) && npm run typecheck && npm run lint && npm run format:check

.PHONY: test
test: test-go test-web ## Run all tests

.PHONY: test-go
test-go: $(FRONTEND)/dist/index.html ## Run Go tests with the race detector
	go test -tags $(GO_TAGS) -race -count=1 $(GO_PKGS)

.PHONY: test-web
test-web: $(NODE_MODULES) ## Run frontend tests
	cd $(FRONTEND) && npm test

.PHONY: coverage
coverage: $(FRONTEND)/dist/index.html $(NODE_MODULES) ## Write coverage reports for Go and TypeScript
	go test -tags $(GO_TAGS) -race -coverprofile=coverage.out ./internal/...
	go tool cover -func=coverage.out | tail -1
	cd $(FRONTEND) && npm run test:coverage

.PHONY: check
check: lint test ## Everything CI runs: lint + tests

## ---------- docker ----------

export DOCKER_UID := $(shell id -u)
export DOCKER_GID := $(shell id -g)

.PHONY: docker-check
docker-check: ## Run lint + tests inside Docker
	docker compose run --rm check

.PHONY: docker-build
docker-build: ## Build the Linux binary in Docker into build/bin
	docker compose run --rm build

.PHONY: docker-bindings
docker-bindings: ## Regenerate frontend/wailsjs inside Docker
	docker compose run --rm bindings
