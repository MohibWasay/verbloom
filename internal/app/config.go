package app

import (
	"fmt"
	"path/filepath"
)

// RecordingsDirEnv overrides the directory recordings are saved to.
const RecordingsDirEnv = "VERBLOOM_RECORDINGS_DIR"

// defaultRecordingsDir is relative to the working directory, which is the
// repository root under `wails dev`.
const defaultRecordingsDir = "tmp"

// Config holds the runtime settings the app is built from.
type Config struct {
	RecordingsDir string
}

// ConfigFromEnv reads Config using getenv (normally os.Getenv) and
// resolves paths to absolute ones.
func ConfigFromEnv(getenv func(string) string) (Config, error) {
	dir := getenv(RecordingsDirEnv)
	if dir == "" {
		dir = defaultRecordingsDir
	}

	abs, err := filepath.Abs(dir)
	if err != nil {
		return Config{}, fmt.Errorf("resolve %s %q: %w", RecordingsDirEnv, dir, err)
	}

	return Config{RecordingsDir: abs}, nil
}
