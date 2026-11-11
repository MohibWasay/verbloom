# Adding a backend feature end-to-end

Use `internal/recording` (stateful service with a lifecycle hook) and `internal/profile` (injected dependency) as reference implementations.

## 1. Create the domain package

```
internal/notes/
  service.go        // bound to the frontend
  note.go           // Note type + validation
  store.go          // Store interface consumed by Service
  memory_store.go   // in-memory Store implementation
  service_test.go
  note_test.go
```

```go
// Package notes manages the user's notes.
package notes

// Store persists notes. Defined here, where it is consumed.
type Store interface {
	Save(ctx context.Context, n Note) error
	List(ctx context.Context) ([]Note, error)
}

// Service is bound to the frontend.
type Service struct {
	store Store
}

// NewService constructs a Service backed by store.
func NewService(store Store) *Service {
	return &Service{store: store}
}
```

## 2. Bind it in `internal/app`

```go
type App struct {
	profile           *profile.Service
	recording         *recording.Service
	shutdownRecording func()
	notes             *notes.Service
}

func New(cfg Config) *App {
	rec, shutdownRecording := recording.NewService(cfg.RecordingsDir)

	return &App{
		profile:           profile.NewService(user.Current),
		recording:         rec,
		shutdownRecording: shutdownRecording,
		notes:             notes.NewService(notes.NewMemoryStore()),
	}
}

func (a *App) bindings() []any {
	return []any{a.profile, a.recording, a.notes}
}
```

Extend `TestOptions` in `internal/app/app_test.go` to assert the new binding.

## 3. Regenerate the TypeScript bindings

```
make bindings          # needs libwebkit2gtk-4.1-dev locally
make docker-bindings   # same thing, inside the toolchain container
```

That produces `frontend/wailsjs/go/notes/Service.{js,d.ts}` and `frontend/wailsjs/go/models.ts` for structs. Then follow the `react-typescript-best-practices` skill to add `frontend/src/features/notes/api/notesApi.ts`.

## Using the Wails runtime (events, dialogs)

Domain packages stay free of Wails. Define what you need as an interface in the domain package and implement it in `internal/app`:

```go
// internal/notes
type Notifier interface {
	NoteSaved(id string)
}

// internal/app
type runtimeNotifier struct{ ctx context.Context }

func (n *runtimeNotifier) NoteSaved(id string) {
	runtime.EventsEmit(n.ctx, "notes:saved", id)
}
```

Set up the `ctx` from `OnStartup` in `Options()`.

## When to create `cmd/` or `pkg/`

Don't, unless asked. This is a single binary whose `main` must stay at the repo root for Wails, and nothing outside this module imports our code.
