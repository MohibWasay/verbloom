---
name: quality-gate
description: The Verbloom definition of done — runs the full lint, type-check and test gate for Go and TypeScript and reviews the change against the project's structure and size rules. Use before saying any coding task in this repository is finished, before committing or opening a pull request, and whenever asked to review, audit or check code quality in Verbloom.
---

# Verbloom quality gate

Work is not done until every step below passes. Report the actual results; never claim a pass you did not see.

## 1. Run the automated gate

```bash
make check            # golangci-lint, tsc, eslint, prettier, go test -race, vitest
```

If the WebKit headers are not installed locally (the root Go package fails to compile), run `make docker-check` instead.

If formatting is the only failure, run `make fmt` and re-run the gate. Fix every other failure in the code. **Never** edit `.golangci.yml`, `eslint.config.js`, `tsconfig*.json` or coverage thresholds to make it pass, unless the user explicitly asks for a rule change.

## 2. Check coverage for the changed code

```bash
make coverage
```

New or changed functions must be exercised by tests, and the frontend threshold (80%) must hold.

## 3. Review the diff by hand

Run `git diff` (plus `git status` for new files) and check each item:

**Structure**
- [ ] Go business logic is in `internal/<domain>`, not in `main.go` or `internal/app`.
- [ ] Each new bound service is added to `bindings()`, and `TestOptions` asserts it.
- [ ] `frontend/wailsjs` is regenerated (not hand-edited) if a bound Go signature changed.
- [ ] Frontend code sits in the right layer (api / hooks / components), and only `api/` imports `@wailsjs`.
- [ ] Nothing new under `shared/` that only one feature uses.

**Size and clarity**
- [ ] No file is near its limit (Go 300 lines, TS 200 lines). If one is close, split it now.
- [ ] Names say what things are, with no `utils`, `helpers`, `data` or `manager` grab-bags.
- [ ] No dead code, commented-out code, debug logging or stray TODOs without an owner.

**Correctness**
- [ ] Every Go error is wrapped with context or returned as a sentinel, and every rejected promise is handled.
- [ ] Async UI guards against stale responses and shows loading and error states.
- [ ] Tests cover the error paths and edge cases, not just the happy path.

**Suppressions**
- [ ] Each `//nolint` or `eslint-disable` names one rule and explains why. Count them in the diff and justify each to the user.

## 4. Report

Tell the user, briefly:
- the gate result (pass, or the failures that remain and why),
- coverage for the touched packages,
- any checklist item you could not satisfy, and what is needed to fix it.
