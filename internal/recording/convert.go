package recording

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
)

// Converter re-encodes a recording into MP4.
type Converter interface {
	ToMP4(ctx context.Context, src, dst string) error
}

// FFmpeg converts recordings with the ffmpeg command-line tool.
type FFmpeg struct {
	path string
}

// LookupFFmpeg finds ffmpeg on PATH.
func LookupFFmpeg() (*FFmpeg, error) {
	path, err := exec.LookPath("ffmpeg")
	if err != nil {
		return nil, fmt.Errorf("find ffmpeg: %w", err)
	}

	return &FFmpeg{path: path}, nil
}

// ToMP4 re-encodes src as H.264 + AAC MP4 at dst, overwriting dst.
func (f *FFmpeg) ToMP4(ctx context.Context, src, dst string) error {
	// #nosec G204 -- the binary comes from LookPath and the arguments are
	// fixed flags plus paths this package created; no shell is involved.
	cmd := exec.CommandContext(ctx, f.path, ffmpegArgs(src, dst)...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg: %w: %s", err, strings.TrimSpace(stderr.String()))
	}

	return nil
}

// ffmpegArgs builds a widely playable MP4: H.264 in yuv420p, AAC audio,
// and the index at the front so players can start before the end loads.
func ffmpegArgs(src, dst string) []string {
	return []string{
		"-hide_banner", "-loglevel", "error", "-nostdin", "-y",
		"-i", src,
		"-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
		"-c:a", "aac", "-b:a", "160k",
		"-movflags", "+faststart",
		"-f", "mp4", dst,
	}
}
