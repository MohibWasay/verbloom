package recording

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strings"
)

// format is a container MediaRecorder can produce.
type format struct {
	name     string
	mimeType string
	// magic is the signature expected at magicOffset in a valid file.
	magic       []byte
	magicOffset int
	// needsConversion is true when the file must be re-encoded to MP4.
	needsConversion bool
}

var (
	// MP4 files start with a box whose type (bytes 4..8) is "ftyp".
	formatMP4 = format{name: "MP4", mimeType: "video/mp4", magic: []byte("ftyp"), magicOffset: 4}
	// WebM files start with the EBML magic number.
	formatWebM = format{
		name:            "WebM",
		mimeType:        "video/webm",
		magic:           []byte{0x1A, 0x45, 0xDF, 0xA3},
		needsConversion: true,
	}
)

// parseFormat maps a MIME type, which may carry codec parameters (e.g.
// `video/webm;codecs="vp8,opus"`), to a supported format.
func parseFormat(mimeType string) (format, bool) {
	base, _, _ := strings.Cut(mimeType, ";")
	base = strings.TrimSpace(base)

	for _, f := range []format{formatMP4, formatWebM} {
		if strings.EqualFold(base, f.mimeType) {
			return f, true
		}
	}

	return format{}, false
}

// hasHeader reports whether r starts with the format's signature.
func (f format) hasHeader(r io.Reader) (bool, error) {
	header := make([]byte, f.magicOffset+len(f.magic))
	if _, err := io.ReadFull(r, header); err != nil {
		if errors.Is(err, io.ErrUnexpectedEOF) || errors.Is(err, io.EOF) {
			return false, nil // shorter than a header
		}
		return false, fmt.Errorf("read header: %w", err)
	}

	return bytes.Equal(header[f.magicOffset:], f.magic), nil
}
