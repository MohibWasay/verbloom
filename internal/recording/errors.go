package recording

import (
	"errors"
	"fmt"
)

var (
	// ErrUnsupportedFormat is returned when the recorder produces neither
	// MP4 nor WebM.
	ErrUnsupportedFormat = errors.New("recording must be MP4 (video/mp4) or WebM (video/webm)")
	// ErrConverterUnavailable is returned when a WebM recording is started
	// but nothing can convert it to MP4.
	ErrConverterUnavailable = errors.New(
		"saving this recording as MP4 needs ffmpeg: install it (sudo apt install ffmpeg) and restart the app",
	)
	// ErrSessionNotFound is returned for an unknown or already finished session.
	ErrSessionNotFound = errors.New("recording session not found")
	// ErrInvalidChunk is returned when a chunk is not valid base64.
	ErrInvalidChunk = errors.New("recording chunk is not valid base64")
	// ErrChunkTooLarge is returned when a chunk exceeds MaxChunkBytes.
	ErrChunkTooLarge = fmt.Errorf("recording chunk exceeds %d bytes", MaxChunkBytes)
	// ErrEmptyRecording is returned when a session is finished with no data.
	ErrEmptyRecording = errors.New("recording is empty")
	// ErrInvalidData is returned when the recorded bytes do not match the
	// format the session was started with.
	ErrInvalidData = errors.New("recorded data is not a valid video file")
)
