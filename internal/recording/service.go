// Package recording saves camera recordings streamed from the frontend.
//
// The frontend records with MediaRecorder and streams each chunk here as
// base64. Chunks are appended to a hidden .part file, so long recordings
// are never held in memory. On Finish the data is validated and published
// as recording-<timestamp>.mp4; WebM recordings (what WebKitGTK can
// produce) are converted to MP4 first.
package recording

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"sync"
	"time"
)

// MaxChunkBytes is the largest decoded chunk AppendChunk accepts.
const MaxChunkBytes = 32 << 20

// Recording describes a finished recording saved on disk.
type Recording struct {
	Path      string `json:"path"`
	FileName  string `json:"fileName"`
	SizeBytes int64  `json:"sizeBytes"`
}

// Option configures a Service.
type Option func(*Service)

// WithClock overrides the clock used to name finished recordings.
func WithClock(now func() time.Time) Option {
	return func(s *Service) { s.now = now }
}

// WithConverter enables WebM recordings, converted to MP4 with c.
func WithConverter(c Converter) Option {
	return func(s *Service) { s.converter = c }
}

// Service is bound to the frontend: every exported method is callable
// from TypeScript, so lifecycle hooks are deliberately not methods.
type Service struct {
	dir       string
	now       func() time.Time
	converter Converter

	// ctx is cancelled on shutdown to abort in-flight conversions.
	ctx    context.Context //nolint:containedctx // owned lifetime of the service, cancelled by shutdown
	cancel context.CancelFunc

	mu       sync.Mutex
	sessions map[string]*session
}

// NewService constructs a Service that saves recordings into dir. Call
// the returned shutdown func when the app exits: it aborts conversions
// and deletes unfinished recordings.
func NewService(dir string, opts ...Option) (svc *Service, shutdown func()) {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Service{
		dir:      dir,
		now:      time.Now,
		ctx:      ctx,
		cancel:   cancel,
		sessions: make(map[string]*session),
	}
	for _, opt := range opts {
		opt(s)
	}

	return s, s.shutdown
}

// Start opens a new recording session for mimeType and returns its ID.
func (s *Service) Start(mimeType string) (string, error) {
	f, ok := parseFormat(mimeType)
	if !ok {
		return "", ErrUnsupportedFormat
	}
	if f.needsConversion && s.converter == nil {
		return "", ErrConverterUnavailable
	}

	sess, err := newSession(s.dir, f)
	if err != nil {
		return "", err
	}

	id := rand.Text()

	s.mu.Lock()
	s.sessions[id] = sess
	s.mu.Unlock()

	return id, nil
}

// AppendChunk appends a base64-encoded chunk to the session's file.
// Chunks must be sent in the order MediaRecorder produced them.
func (s *Service) AppendChunk(id, chunk string) error {
	if base64.StdEncoding.DecodedLen(len(chunk)) > MaxChunkBytes {
		return ErrChunkTooLarge
	}

	data, err := base64.StdEncoding.DecodeString(chunk)
	if err != nil {
		return ErrInvalidChunk
	}

	sess, err := s.session(id)
	if err != nil {
		return err
	}

	return sess.write(data)
}

// Finish closes the session and saves the recording as an MP4 file,
// converting it first if it was recorded in another format.
func (s *Service) Finish(id string) (Recording, error) {
	sess, err := s.take(id)
	if err != nil {
		return Recording{}, err
	}
	defer sess.discard()

	src, err := sess.seal()
	if err != nil {
		return Recording{}, err
	}
	if sess.format.needsConversion {
		return s.convertAndSave(src)
	}

	return saveMP4(src, s.dir, s.now())
}

// Discard abandons the session and deletes its data.
func (s *Service) Discard(id string) error {
	sess, err := s.take(id)
	if err != nil {
		return err
	}

	sess.discard()

	return nil
}

func (s *Service) convertAndSave(src string) (Recording, error) {
	out, err := os.CreateTemp(s.dir, ".recording-*.mp4.part")
	if err != nil {
		return Recording{}, fmt.Errorf("create converted file: %w", err)
	}
	_ = out.Close() // ffmpeg reopens it by name
	// Best effort: once saved, the published file is a separate hard link.
	defer os.Remove(out.Name())

	if err := s.converter.ToMP4(s.ctx, src, out.Name()); err != nil {
		return Recording{}, fmt.Errorf("convert recording to MP4: %w", err)
	}

	return saveMP4(out.Name(), s.dir, s.now())
}

// shutdown aborts conversions and discards every unfinished session.
func (s *Service) shutdown() {
	s.cancel()

	s.mu.Lock()
	sessions := s.sessions
	s.sessions = make(map[string]*session)
	s.mu.Unlock()

	for _, sess := range sessions {
		sess.discard()
	}
}

func (s *Service) session(id string) (*session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[id]
	if !ok {
		return nil, ErrSessionNotFound
	}

	return sess, nil
}

// take removes the session from the registry and returns it.
func (s *Service) take(id string) (*session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[id]
	if !ok {
		return nil, ErrSessionNotFound
	}
	delete(s.sessions, id)

	return sess, nil
}
