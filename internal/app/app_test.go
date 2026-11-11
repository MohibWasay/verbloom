package app

import (
	"path/filepath"
	"testing"
	"testing/fstest"

	"verbloom/internal/profile"
	"verbloom/internal/recording"
)

func TestOptions(t *testing.T) {
	t.Parallel()

	assets := fstest.MapFS{"index.html": {Data: []byte("<html></html>")}}
	opts := New(Config{RecordingsDir: t.TempDir()}).Options(assets)

	if opts.Title != title {
		t.Errorf("Title = %q, want %q", opts.Title, title)
	}
	if opts.AssetServer == nil || opts.AssetServer.Assets == nil {
		t.Fatal("AssetServer assets not configured")
	}
	if opts.OnDomReady == nil || opts.OnShutdown == nil {
		t.Error("OnDomReady and OnShutdown hooks must be set")
	}
	if len(opts.Bind) != 2 {
		t.Fatalf("len(Bind) = %d, want 2", len(opts.Bind))
	}
	if _, ok := opts.Bind[0].(*profile.Service); !ok {
		t.Errorf("Bind[0] = %T, want *profile.Service", opts.Bind[0])
	}
	if _, ok := opts.Bind[1].(*recording.Service); !ok {
		t.Errorf("Bind[1] = %T, want *recording.Service", opts.Bind[1])
	}
}

func TestShutdownDiscardsUnfinishedRecordings(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	a := New(Config{RecordingsDir: dir})

	if _, err := a.recording.Start("video/mp4"); err != nil {
		t.Fatalf("Start() error = %v", err)
	}

	a.shutdown(t.Context())

	matches, err := filepath.Glob(filepath.Join(dir, "*"))
	if err != nil {
		t.Fatalf("Glob() error = %v", err)
	}
	if len(matches) != 0 {
		t.Errorf("files after shutdown = %v, want none", matches)
	}
}

func TestConfigFromEnv(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		env  map[string]string
		want string
	}{
		{name: "default is tmp in working dir", env: nil, want: "tmp"},
		{name: "relative override", env: map[string]string{RecordingsDirEnv: "out/videos"}, want: "out/videos"},
		{name: "absolute override", env: map[string]string{RecordingsDirEnv: "/var/rec"}, want: "/var/rec"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			cfg, err := ConfigFromEnv(func(k string) string { return tt.env[k] })
			if err != nil {
				t.Fatalf("ConfigFromEnv() error = %v", err)
			}

			want, err := filepath.Abs(tt.want)
			if err != nil {
				t.Fatalf("Abs() error = %v", err)
			}
			if cfg.RecordingsDir != want {
				t.Errorf("RecordingsDir = %q, want %q", cfg.RecordingsDir, want)
			}
		})
	}
}
