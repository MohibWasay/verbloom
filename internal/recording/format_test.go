package recording

import (
	"bytes"
	"errors"
	"slices"
	"testing"
	"testing/iotest"
	"time"
)

func TestParseFormat(t *testing.T) {
	t.Parallel()

	tests := []struct {
		mime   string
		want   string
		wantOK bool
	}{
		{mime: "video/mp4", want: "MP4", wantOK: true},
		{mime: ` VIDEO/MP4 ; codecs="avc1,mp4a"`, want: "MP4", wantOK: true},
		{mime: "video/webm", want: "WebM", wantOK: true},
		{mime: "video/webm;codecs=vp8,opus", want: "WebM", wantOK: true},
		{mime: "video/x-matroska", wantOK: false},
		{mime: "audio/mp4", wantOK: false},
		{mime: "", wantOK: false},
	}

	for _, tt := range tests {
		got, ok := parseFormat(tt.mime)
		if ok != tt.wantOK || got.name != tt.want {
			t.Errorf("parseFormat(%q) = %q, %v; want %q, %v", tt.mime, got.name, ok, tt.want, tt.wantOK)
		}
	}
}

func TestFormatHasHeader(t *testing.T) {
	t.Parallel()

	ebml := []byte{0x1A, 0x45, 0xDF, 0xA3}

	tests := []struct {
		name   string
		format format
		input  []byte
		want   bool
	}{
		{name: "mp4 ftyp box", format: formatMP4, input: []byte("\x00\x00\x00\x18ftypisom"), want: true},
		{name: "mp4 exactly header size", format: formatMP4, input: []byte("\x00\x00\x00\x08ftyp"), want: true},
		{name: "mp4 given webm", format: formatMP4, input: slices.Concat(ebml, []byte("webm....")), want: false},
		{name: "mp4 too short", format: formatMP4, input: []byte("ftyp"), want: false},
		{name: "webm EBML magic", format: formatWebM, input: slices.Concat(ebml, []byte{0x9F}), want: true},
		{name: "webm given mp4", format: formatWebM, input: []byte("\x00\x00\x00\x18ftypisom"), want: false},
		{name: "webm empty", format: formatWebM, input: nil, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := tt.format.hasHeader(bytes.NewReader(tt.input))
			if err != nil {
				t.Fatalf("hasHeader() error = %v", err)
			}
			if got != tt.want {
				t.Errorf("%s.hasHeader(%q) = %v, want %v", tt.format.name, tt.input, got, tt.want)
			}
		})
	}
}

func TestFormatHasHeaderReadError(t *testing.T) {
	t.Parallel()

	readErr := errors.New("disk on fire")

	if _, err := formatMP4.hasHeader(iotest.ErrReader(readErr)); !errors.Is(err, readErr) {
		t.Fatalf("hasHeader() error = %v, want wrapping %v", err, readErr)
	}
}

func TestFileName(t *testing.T) {
	t.Parallel()

	at := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)

	tests := []struct {
		attempt int
		want    string
	}{
		{attempt: 0, want: "recording-20260102-030405.mp4"},
		{attempt: 1, want: "recording-20260102-030405-1.mp4"},
		{attempt: 12, want: "recording-20260102-030405-12.mp4"},
	}

	for _, tt := range tests {
		if got := fileName(at, tt.attempt); got != tt.want {
			t.Errorf("fileName(%v, %d) = %q, want %q", at, tt.attempt, got, tt.want)
		}
	}
}
