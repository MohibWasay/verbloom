package recording

import (
	"fmt"
	"io"
	"os"
	"sync"
)

// session is one in-progress recording, streamed into a hidden .part file.
type session struct {
	format format

	mu   sync.Mutex
	file *os.File
	size int64
}

func newSession(dir string, f format) (*session, error) {
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, fmt.Errorf("create recordings directory: %w", err)
	}

	file, err := os.CreateTemp(dir, ".recording-*.part")
	if err != nil {
		return nil, fmt.Errorf("create recording file: %w", err)
	}

	return &session{format: f, file: file}, nil
}

func (s *session) write(data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	n, err := s.file.Write(data)
	s.size += int64(n)
	if err != nil {
		return fmt.Errorf("write recording chunk: %w", err)
	}

	return nil
}

// seal validates the recorded data, closes the file and returns its path.
// The caller must still call discard once it no longer needs the file.
func (s *session) seal() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.size == 0 {
		return "", ErrEmptyRecording
	}
	if _, err := s.file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("rewind recording file: %w", err)
	}

	ok, err := s.format.hasHeader(s.file)
	if err != nil {
		return "", fmt.Errorf("check recording format: %w", err)
	}
	if !ok {
		return "", fmt.Errorf("%w: expected %s", ErrInvalidData, s.format.name)
	}
	if err := s.file.Close(); err != nil {
		return "", fmt.Errorf("close recording file: %w", err)
	}

	return s.file.Name(), nil
}

// discard closes and deletes the in-progress file.
func (s *session) discard() {
	s.mu.Lock()
	defer s.mu.Unlock()

	_ = s.file.Close()           // may already be closed by seal
	_ = os.Remove(s.file.Name()) // best effort: a leftover .part is harmless
}
