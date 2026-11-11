# Go testing patterns

Run: `make test-go` (race detector on) · coverage: `make coverage` · single package: `go test -tags webkit2_41 -race ./internal/recording/`.

## Table-driven template

```go
func TestFinishFailures(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		chunks  [][]byte
		wantErr error
	}{
		{name: "no data", chunks: nil, wantErr: recording.ErrEmptyRecording},
		{name: "not mp4", chunks: [][]byte{[]byte("RIFF....WEBM....")}, wantErr: recording.ErrNotMP4},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, dir := newService(t) // helper: t.TempDir() + t.Cleanup(shutdown)
			id := start(t, svc)
			appendChunks(t, svc, id, tt.chunks...)

			if _, err := svc.Finish(id); !errors.Is(err, tt.wantErr) {
				t.Fatalf("Finish() error = %v, want %v", err, tt.wantErr)
			}
			if names := dirEntries(t, dir); len(names) != 0 {
				t.Errorf("directory = %v, want empty after failed finish", names)
			}
		})
	}
}
```

## Fakes

Write the smallest struct that satisfies the consumer's interface. Put it in the `_test.go` file that uses it, or in `fakes_test.go` once two test files share it.

```go
type fakeStore struct {
	saved []notes.Note
	err   error
}

func (f *fakeStore) Save(_ context.Context, n notes.Note) error {
	f.saved = append(f.saved, n)
	return f.err
}
```

## Helpers

Mark them with `t.Helper()` (the `thelper` linter checks this) and pass `t` first. Use `t.TempDir()`, `t.Setenv()` and `t.Cleanup()` instead of manual setup and teardown. Use `t.Context()` when a test needs a context.

## Comparing structs

Use `reflect.DeepEqual` for simple cases. If diffs become unreadable, add `github.com/google/go-cmp/cmp` and use `cmp.Diff(want, got)`, printing `(-want +got)`.

## What to cover

- Every exported function: happy path, each error return, and boundaries (empty, exactly at the limit, one past it, unicode, nil).
- `internal/app`: that `Options()` binds every service, so a forgotten binding fails CI.
- Skip trivial getters and generated code.

## Integration tests

Tests that touch the filesystem, network or a real database get a build tag:

```go
//go:build integration
```

Run them with `go test -tags "webkit2_41 integration" ./...`. Keep unit tests hermetic and fast.
