package recording_test

import (
	"bytes"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"verbloom/internal/recording"
)

const mp4Mime = `video/mp4;codecs="avc1,mp4a"`

var (
	fixedTime = time.Date(2026, 10, 29, 14, 5, 9, 0, time.UTC)
	mp4Header = []byte{0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'}
	mp4Body   = []byte("moof-mdat-payload")
)

func newService(t *testing.T) (svc *recording.Service, dir string) {
	t.Helper()

	dir = filepath.Join(t.TempDir(), "tmp")
	svc, shutdown := recording.NewService(dir, recording.WithClock(func() time.Time { return fixedTime }))
	t.Cleanup(shutdown)

	return svc, dir
}

func encode(b []byte) string {
	return base64.StdEncoding.EncodeToString(b)
}

func start(t *testing.T, svc *recording.Service) string {
	t.Helper()

	id, err := svc.Start(mp4Mime)
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}

	return id
}

func appendChunks(t *testing.T, svc *recording.Service, id string, chunks ...[]byte) {
	t.Helper()

	for _, c := range chunks {
		if err := svc.AppendChunk(id, encode(c)); err != nil {
			t.Fatalf("AppendChunk() error = %v", err)
		}
	}
}

func dirEntries(t *testing.T, dir string) []string {
	t.Helper()

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir(%q) error = %v", dir, err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}

	return names
}

func TestRecordAndFinish(t *testing.T) {
	t.Parallel()

	svc, dir := newService(t)
	id := start(t, svc)
	appendChunks(t, svc, id, mp4Header, mp4Body)

	got, err := svc.Finish(id)
	if err != nil {
		t.Fatalf("Finish() error = %v", err)
	}

	wantName := "recording-20261029-140509.mp4"
	want := recording.Recording{
		Path:      filepath.Join(dir, wantName),
		FileName:  wantName,
		SizeBytes: int64(len(mp4Header) + len(mp4Body)),
	}
	if got != want {
		t.Errorf("Finish() = %+v, want %+v", got, want)
	}

	data, err := os.ReadFile(got.Path)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if !bytes.Equal(data, slices.Concat(mp4Header, mp4Body)) {
		t.Errorf("saved file content = %q, want header+body", data)
	}
	if names := dirEntries(t, dir); !slices.Equal(names, []string{wantName}) {
		t.Errorf("directory = %v, want only %q (no leftover .part files)", names, wantName)
	}
}

func TestFinishDoesNotOverwriteExistingRecording(t *testing.T) {
	t.Parallel()

	svc, _ := newService(t)
	wantNames := []string{"recording-20261029-140509.mp4", "recording-20261029-140509-1.mp4"}

	for _, wantName := range wantNames {
		id := start(t, svc)
		appendChunks(t, svc, id, mp4Header)

		got, err := svc.Finish(id)
		if err != nil {
			t.Fatalf("Finish() error = %v", err)
		}
		if got.FileName != wantName {
			t.Errorf("FileName = %q, want %q", got.FileName, wantName)
		}
	}
}

func TestStartRejectsUnsupportedFormats(t *testing.T) {
	t.Parallel()

	svc, _ := newService(t)

	for _, mime := range []string{"video/x-matroska", "video/ogg", "", "audio/mp4"} {
		if _, err := svc.Start(mime); !errors.Is(err, recording.ErrUnsupportedFormat) {
			t.Errorf("Start(%q) error = %v, want %v", mime, err, recording.ErrUnsupportedFormat)
		}
	}
}

func TestStartAcceptsMP4Variants(t *testing.T) {
	t.Parallel()

	svc, _ := newService(t)

	for _, mime := range []string{"video/mp4", "VIDEO/MP4", ` video/mp4 ; codecs="avc1"`} {
		if _, err := svc.Start(mime); err != nil {
			t.Errorf("Start(%q) error = %v, want nil", mime, err)
		}
	}
}

func TestFinishFailures(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		chunks  [][]byte
		wantErr error
	}{
		{name: "no data", chunks: nil, wantErr: recording.ErrEmptyRecording},
		{name: "not mp4", chunks: [][]byte{[]byte("RIFF....WEBM....")}, wantErr: recording.ErrInvalidData},
		{name: "shorter than header", chunks: [][]byte{[]byte("abc")}, wantErr: recording.ErrInvalidData},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, dir := newService(t)
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

func TestAppendChunkErrors(t *testing.T) {
	t.Parallel()

	svc, _ := newService(t)
	id := start(t, svc)
	tooLarge := strings.Repeat("A", base64.StdEncoding.EncodedLen(recording.MaxChunkBytes+3))

	tests := []struct {
		name    string
		id      string
		chunk   string
		wantErr error
	}{
		{name: "unknown session", id: "nope", chunk: encode(mp4Header), wantErr: recording.ErrSessionNotFound},
		{name: "invalid base64", id: id, chunk: "not base64!", wantErr: recording.ErrInvalidChunk},
		{name: "too large", id: id, chunk: tooLarge, wantErr: recording.ErrChunkTooLarge},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if err := svc.AppendChunk(tt.id, tt.chunk); !errors.Is(err, tt.wantErr) {
				t.Errorf("AppendChunk() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func TestSessionCannotBeReusedAfterFinishOrDiscard(t *testing.T) {
	t.Parallel()

	svc, dir := newService(t)

	finished := start(t, svc)
	appendChunks(t, svc, finished, mp4Header)
	if _, err := svc.Finish(finished); err != nil {
		t.Fatalf("Finish() error = %v", err)
	}

	discarded := start(t, svc)
	appendChunks(t, svc, discarded, mp4Header)
	if err := svc.Discard(discarded); err != nil {
		t.Fatalf("Discard() error = %v", err)
	}

	for _, id := range []string{finished, discarded} {
		if _, err := svc.Finish(id); !errors.Is(err, recording.ErrSessionNotFound) {
			t.Errorf("Finish(used id) error = %v, want %v", err, recording.ErrSessionNotFound)
		}
		if err := svc.Discard(id); !errors.Is(err, recording.ErrSessionNotFound) {
			t.Errorf("Discard(used id) error = %v, want %v", err, recording.ErrSessionNotFound)
		}
	}
	if names := dirEntries(t, dir); len(names) != 1 {
		t.Errorf("directory = %v, want only the finished recording", names)
	}
}

func TestShutdownDiscardsUnfinishedSessions(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	svc, shutdown := recording.NewService(dir)
	id := start(t, svc)
	appendChunks(t, svc, id, mp4Header)

	shutdown()

	if names := dirEntries(t, dir); len(names) != 0 {
		t.Errorf("directory = %v, want empty after shutdown", names)
	}
	if err := svc.AppendChunk(id, encode(mp4Body)); !errors.Is(err, recording.ErrSessionNotFound) {
		t.Errorf("AppendChunk after shutdown error = %v, want %v", err, recording.ErrSessionNotFound)
	}
}

func TestConcurrentSessions(t *testing.T) {
	t.Parallel()

	const sessions = 8

	dir := t.TempDir()
	svc, shutdown := recording.NewService(dir)
	t.Cleanup(shutdown)

	var wg sync.WaitGroup
	for range sessions {
		wg.Go(func() {
			id, err := svc.Start(mp4Mime)
			if err != nil {
				t.Errorf("Start() error = %v", err)
				return
			}
			for _, c := range [][]byte{mp4Header, mp4Body, mp4Body} {
				if err := svc.AppendChunk(id, encode(c)); err != nil {
					t.Errorf("AppendChunk() error = %v", err)
				}
			}
			if _, err := svc.Finish(id); err != nil {
				t.Errorf("Finish() error = %v", err)
			}
		})
	}
	wg.Wait()

	if names := dirEntries(t, dir); len(names) != sessions {
		t.Errorf("got %d recordings, want %d: %v", len(names), sessions, names)
	}
}
