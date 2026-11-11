package recording

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"testing"
)

func TestFFmpegArgs(t *testing.T) {
	t.Parallel()

	args := ffmpegArgs("in.webm", "out.part")

	for _, want := range [][]string{
		{"-i", "in.webm"},
		{"-c:v", "libx264"},
		{"-pix_fmt", "yuv420p"},
		{"-c:a", "aac"},
		{"-movflags", "+faststart"},
		{"-f", "mp4", "out.part"},
	} {
		if !containsRun(args, want) {
			t.Errorf("ffmpegArgs() = %v, missing %v", args, want)
		}
	}
	if args[len(args)-1] != "out.part" {
		t.Errorf("last arg = %q, want the destination", args[len(args)-1])
	}
}

// TestFFmpegToMP4 runs the real ffmpeg: it records a one-second WebM
// like MediaRecorder would, converts it, and checks the MP4 header.
func TestFFmpegToMP4(t *testing.T) {
	t.Parallel()

	ff, err := LookupFFmpeg()
	if err != nil {
		t.Skipf("ffmpeg not installed: %v", err)
	}

	dir := t.TempDir()
	src := filepath.Join(dir, "in.webm")
	dst := filepath.Join(dir, "out.part")
	makeWebM(t, ff.path, src)

	if err := ff.ToMP4(t.Context(), src, dst); err != nil {
		t.Fatalf("ToMP4() error = %v", err)
	}

	f, err := os.Open(dst)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer f.Close()

	if ok, err := formatMP4.hasHeader(f); err != nil || !ok {
		t.Errorf("converted file is not MP4 (ok=%v, err=%v)", ok, err)
	}
}

func TestFFmpegToMP4Errors(t *testing.T) {
	t.Parallel()

	ff, err := LookupFFmpeg()
	if err != nil {
		t.Skipf("ffmpeg not installed: %v", err)
	}

	dir := t.TempDir()
	garbage := filepath.Join(dir, "garbage.webm")
	if err := os.WriteFile(garbage, []byte("not a video"), 0o600); err != nil {
		t.Fatal(err)
	}

	if err := ff.ToMP4(t.Context(), garbage, filepath.Join(dir, "out.part")); err == nil {
		t.Error("ToMP4(garbage) error = nil, want failure")
	}

	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if err := ff.ToMP4(ctx, garbage, filepath.Join(dir, "out2.part")); err == nil {
		t.Error("ToMP4(cancelled ctx) error = nil, want failure")
	}
}

func makeWebM(t *testing.T, ffmpeg, dst string) {
	t.Helper()

	cmd := exec.CommandContext(t.Context(), ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
		"-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=1",
		"-f", "lavfi", "-i", "sine=frequency=440:duration=1",
		"-c:v", "libvpx", "-c:a", "libopus", "-f", "webm", dst)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		t.Fatalf("create test WebM: %v: %s", err, stderr.String())
	}
}

func containsRun(haystack, needle []string) bool {
	for i := range len(haystack) - len(needle) + 1 {
		if slices.Equal(haystack[i:i+len(needle)], needle) {
			return true
		}
	}

	return false
}
