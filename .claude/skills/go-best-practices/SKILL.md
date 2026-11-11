---
name: go-best-practices
description: Verbloom's Go standards — package layout under internal/, Wails service binding, small files and functions, error handling, interfaces, concurrency, and table-driven tests. Use whenever writing, refactoring, reviewing or testing Go code in this repository (main.go, internal/**), adding a new backend feature or Wails-bound service, or when golangci-lint reports a problem.
---

# Go best practices for Verbloom

Write Go that a reviewer would merge without comments. The linters in `.golangci.yml` enforce most of this; the rest is on you.

## Before you write code

1. Decide which **domain package** owns the change (`internal/<domain>`). Create a new package when the concept is new; never park logic in `main.go` or `internal/app`.
2. Read the package's existing files so the new code matches its naming and style.
3. Write or extend the test first when the behaviour is clear.

## Layout

```
main.go                 embed assets, build options, wails.Run — nothing else
internal/app/app.go     window options + bindings() list; no business logic
internal/<domain>/
  service.go            exported Service bound to the frontend (thin, validates input)
  <concept>.go          domain types and pure logic, one concept per file
  store.go / client.go  I/O behind small interfaces the Service depends on
  *_test.go             tests next to the code they cover
```

- One package = one responsibility. Package names are short, lower-case and singular (`recording`, not `recordings` or `recordingService`). No `util`, `common`, `helpers` or `models` packages.
- Everything lives under `internal/` unless another module must import it.
- Dependencies point inward: `app` → domain packages → stdlib/third-party. Domain packages never import `internal/app` or Wails.
- See `references/layout.md` for how to add a new bound service end-to-end.

## Size limits (enforced)

- File ≤ 300 lines (revive `file-length-limit`). Function ≤ 60 lines / 40 statements (`funlen`). Cyclomatic ≤ 10 (`cyclop`), cognitive ≤ 15 (`gocognit`), nesting ≤ 4 (`nestif`).
- When a file approaches the limit, split by concept (types, validation, persistence), not alphabetically or by `part1.go`.

## Wails boundary

- Bind **domain services**, not a god `App` struct. Add them to `bindings()` in `internal/app/app.go`.
- Every exported method on a bound struct becomes a TypeScript function, so export only what the frontend should call. Helpers stay unexported.
- Bound methods take and return plain, JSON-serialisable types (structs with `json` tags, strings, numbers, slices). Return `(T, error)`; Wails rejects the JS promise with `err.Error()`, so error messages must be safe and meaningful to show a user.
- Need `context.Context` or the Wails runtime (events, dialogs)? Inject it via an `OnStartup` hook in `internal/app` and pass it to the service through a small interface. Never store a `ctx` in a domain package just to have one.
- Lifecycle hooks (shutdown, cleanup) must **not** be exported methods on a bound struct, or JavaScript could call them. Return them from the constructor instead: `svc, shutdown := recording.NewService(dir)`, and call `shutdown` from `OnShutdown` in `internal/app`.
- Large binary payloads (recordings, files) arrive in ordered base64 chunks streamed to disk, with a per-chunk size cap. Never take a whole file in one call.
- After changing a bound signature, run `make bindings` and commit `frontend/wailsjs`.

## Platform-specific and cgo code

- Isolate it in its own package (e.g. `internal/webview`), with build-tagged files: `x_linux.go` with `//go:build linux && webkit2_41`, plus a no-op `x_other.go` with the inverse tag.
- C goes in a `.c` file next to it, not in the cgo preamble. A file with `//export` may only declare in its preamble.
- Keep the decision logic (such as `isTrustedURI`) in plain Go in an untagged file, so it is unit-tested without cgo. The C side only calls it.
- cgo packages need GTK/WebKit headers to compile. If they're missing locally, verify with `make docker-check`.

## Errors

- Return errors; never `panic` outside `main` for expected failures. `log.Fatal` only in `main`.
- Wrap with context using `%w`: `fmt.Errorf("load profile %q: %w", id, err)`. The message says what was being done, lower-case, no trailing punctuation, no "failed to".
- Sentinel errors are `var ErrX = errors.New(...)`; custom types are `XError`. Compare with `errors.Is` and `errors.As`, never by string.
- Handle every error exactly once: either return it or log it, not both.

## Types and interfaces

- Accept interfaces, return concrete types. Define an interface **in the consumer package**, with only the methods it uses (often one or two).
- Constructors are `NewX(deps...) *X` and take dependencies explicitly. No package-level mutable state, no `init()` side effects.
- Use the zero value when it works. Prefer named types and constants over magic strings and numbers.
- Use `any` only at true boundaries (e.g. the Wails `Bind` list).

## Concurrency

- Do not start goroutines in libraries unless the API is about concurrency. When you do, the caller must be able to stop them (via `context.Context`), and errors must flow back (`errgroup`).
- `context.Context` is the first parameter, named `ctx`, and is never stored in a struct.
- Protect shared state with a mutex placed next to the fields it guards, or avoid sharing it. Tests always run with `-race`.

## Style

- `gofumpt` + `goimports` with `verbloom` as the local prefix (run `make fmt`). Imports go in three groups: stdlib, third-party, `verbloom/...`.
- Every exported identifier and every package has a doc comment that starts with its name.
- Early returns over `else`; keep the happy path at the left margin.
- Names: short for short scopes (`i`, `r`), descriptive for package-level ones. Receivers are 1–2 letters and consistent within a type. No `Get` prefix on getters.

## Tests

Details and templates are in `references/testing.md`. In short:

- Table-driven with `t.Run`, `t.Parallel()` on the test and on each subtest.
- Black-box (`package x_test`) by default; white-box only to reach unexported behaviour that has no public path.
- Fakes are small hand-written structs that satisfy the consumer's interface. No mocking framework.
- Assert with the stdlib: `if got != want { t.Errorf("F(%v) = %v, want %v", in, got, want) }`. Use `t.Fatalf` only when continuing makes no sense.
- Each new exported function gets tests for the happy path, every error branch and the edge cases (empty, max length, unicode, nil).

## Done means

`make check` passes with zero lint issues, new code is covered by tests, and no `//nolint` was added without `//nolint:<linter> // <reason>`.
