package recording

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"time"
)

const (
	fileExtension = ".mp4"
	// maxNameAttempts bounds how many suffixed names are tried when a
	// recording with the same timestamp already exists.
	maxNameAttempts = 100
)

// saveMP4 publishes the MP4 at src under a timestamped name in dir.
func saveMP4(src, dir string, now time.Time) (Recording, error) {
	path, err := linkUnique(src, dir, now)
	if err != nil {
		return Recording{}, err
	}

	info, err := os.Stat(path)
	if err != nil {
		return Recording{}, fmt.Errorf("stat saved recording: %w", err)
	}

	return Recording{Path: path, FileName: filepath.Base(path), SizeBytes: info.Size()}, nil
}

// linkUnique hard-links src into dir under a timestamped name. Linking
// fails instead of overwriting, so an existing recording is never replaced.
func linkUnique(src, dir string, now time.Time) (string, error) {
	for attempt := range maxNameAttempts {
		dst := filepath.Join(dir, fileName(now, attempt))

		err := os.Link(src, dst)
		if err == nil {
			return dst, nil
		}
		if !errors.Is(err, fs.ErrExist) {
			return "", fmt.Errorf("save recording: %w", err)
		}
	}

	return "", fmt.Errorf("save recording: no free file name after %d attempts", maxNameAttempts)
}

// fileName returns the name for a recording finished at t. attempt > 0
// appends a suffix to avoid clashing with an existing file.
func fileName(t time.Time, attempt int) string {
	stamp := t.Format("20060102-150405")
	if attempt == 0 {
		return "recording-" + stamp + fileExtension
	}

	return fmt.Sprintf("recording-%s-%d%s", stamp, attempt, fileExtension)
}
