// Package app wires the domain services into a Wails application.
//
// It owns window configuration, lifecycle hooks and the list of services
// bound to the frontend. It holds no business logic of its own.
package app

import (
	"context"
	"io/fs"
	"os/user"

	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"verbloom/internal/profile"
	"verbloom/internal/recording"
	"verbloom/internal/webview"
)

const (
	title  = "Verbloom"
	width  = 1024
	height = 768
)

// App holds the services exposed to the frontend.
type App struct {
	profile           *profile.Service
	recording         *recording.Service
	shutdownRecording func()
}

// New constructs an App from cfg with its default services.
func New(cfg Config) *App {
	rec, shutdownRecording := recording.NewService(cfg.RecordingsDir, recordingOptions()...)

	return &App{
		profile:           profile.NewService(user.Current),
		recording:         rec,
		shutdownRecording: shutdownRecording,
	}
}

// Options returns the Wails configuration that serves assets and binds
// every frontend-facing service.
func (a *App) Options(assets fs.FS) *options.App {
	return &options.App{
		Title:            title,
		Width:            width,
		Height:           height,
		AssetServer:      &assetserver.Options{Assets: assets},
		BackgroundColour: &options.RGBA{R: 10, G: 10, B: 10, A: 1},
		OnDomReady:       a.domReady,
		OnShutdown:       a.shutdown,
		Bind:             a.bindings(),
	}
}

// bindings lists the structs whose exported methods become callable
// from TypeScript via the generated frontend/wailsjs bindings.
func (a *App) bindings() []any {
	return []any{
		a.profile,
		a.recording,
	}
}

// recordingOptions enables WebM recordings (all WebKitGTK can produce)
// when ffmpeg is available to convert them to MP4. Without it, WebM
// sessions are refused with an error that says what to install.
func recordingOptions() []recording.Option {
	ff, err := recording.LookupFFmpeg()
	if err != nil {
		return nil
	}

	return []recording.Option{recording.WithConverter(ff)}
}

func (a *App) domReady(context.Context) {
	webview.EnableMediaCapture()
}

func (a *App) shutdown(context.Context) {
	a.shutdownRecording()
}
