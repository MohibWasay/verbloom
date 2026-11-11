package recording_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"verbloom/internal/recording"
)

const webmMime = `video/webm;codecs="vp8,opus"`

var webmHeader = []byte{0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81}

// fakeConverter "converts" by writing a fixed MP4 header plus the source.
type fakeConverter struct {
	err error
	ctx context.Context //nolint:containedctx // records the ctx the service passed in
}

func (f *fakeConverter) ToMP4(ctx context.Context, src, dst string) error {
	f.ctx = ctx
	if f.err != nil {
		return f.err
	}

	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	return os.WriteFile(dst, slices.Concat(mp4Header, data), 0o600)
}

func newConvertingService(t *testing.T, conv recording.Converter) (svc *recording.Service, dir string) {
	t.Helper()

	dir = t.TempDir()
	svc, shutdown := recording.NewService(dir,
		recording.WithClock(func() time.Time { return fixedTime }),
		recording.WithConverter(conv),
	)
	t.Cleanup(shutdown)

	return svc, dir
}

func startWebM(t *testing.T, svc *recording.Service) string {
	t.Helper()

	id, err := svc.Start(webmMime)
	if err != nil {
		t.Fatalf("Start(%q) error = %v", webmMime, err)
	}

	return id
}

func TestWebMIsConvertedToMP4(t *testing.T) {
	t.Parallel()

	conv := &fakeConverter{}
	svc, dir := newConvertingService(t, conv)
	id := startWebM(t, svc)
	appendChunks(t, svc, id, webmHeader, mp4Body)

	got, err := svc.Finish(id)
	if err != nil {
		t.Fatalf("Finish() error = %v", err)
	}

	want := slices.Concat(mp4Header, webmHeader, mp4Body)
	if got.FileName != "recording-20261029-140509.mp4" || got.SizeBytes != int64(len(want)) {
		t.Errorf("Finish() = %+v, want recording-20261029-140509.mp4 of %d bytes", got, len(want))
	}
	data, err := os.ReadFile(filepath.Join(dir, got.FileName))
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if !slices.Equal(data, want) {
		t.Errorf("saved file = %q, want converted content", data)
	}
	if names := dirEntries(t, dir); !slices.Equal(names, []string{got.FileName}) {
		t.Errorf("directory = %v, want only %q (no leftover .part files)", names, got.FileName)
	}
}

func TestWebMWithoutConverterIsRejectedUpFront(t *testing.T) {
	t.Parallel()

	svc, dir := newService(t)

	if _, err := svc.Start(webmMime); !errors.Is(err, recording.ErrConverterUnavailable) {
		t.Fatalf("Start(%q) error = %v, want %v", webmMime, err, recording.ErrConverterUnavailable)
	}
	if _, err := os.Stat(dir); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("recordings directory created for a rejected session (stat err = %v)", err)
	}
}

func TestWebMConversionFailureLeavesNoFiles(t *testing.T) {
	t.Parallel()

	convErr := errors.New("ffmpeg: exit status 1: invalid data")
	svc, dir := newConvertingService(t, &fakeConverter{err: convErr})
	id := startWebM(t, svc)
	appendChunks(t, svc, id, webmHeader)

	if _, err := svc.Finish(id); !errors.Is(err, convErr) {
		t.Fatalf("Finish() error = %v, want wrapping %v", err, convErr)
	}
	if names := dirEntries(t, dir); len(names) != 0 {
		t.Errorf("directory = %v, want empty after failed conversion", names)
	}
}

func TestWebMDataIsValidatedBeforeConverting(t *testing.T) {
	t.Parallel()

	conv := &fakeConverter{}
	svc, _ := newConvertingService(t, conv)
	id := startWebM(t, svc)
	appendChunks(t, svc, id, mp4Header) // MP4 bytes in a WebM session

	if _, err := svc.Finish(id); !errors.Is(err, recording.ErrInvalidData) {
		t.Fatalf("Finish() error = %v, want %v", err, recording.ErrInvalidData)
	}
	if conv.ctx != nil {
		t.Error("converter ran on invalid data")
	}
}

func TestShutdownCancelsConversions(t *testing.T) {
	t.Parallel()

	conv := &fakeConverter{}
	svc, shutdown := recording.NewService(t.TempDir(), recording.WithConverter(conv))
	id := startWebM(t, svc)
	appendChunks(t, svc, id, webmHeader)
	if _, err := svc.Finish(id); err != nil {
		t.Fatalf("Finish() error = %v", err)
	}

	shutdown()

	if !errors.Is(conv.ctx.Err(), context.Canceled) {
		t.Errorf("converter ctx error after shutdown = %v, want %v", conv.ctx.Err(), context.Canceled)
	}
}
