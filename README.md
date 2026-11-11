# Verbloom

Desktop app built with [Wails v2](https://wails.io): a Go backend and a React 19 + TypeScript frontend.

## Prerequisites

- Go 1.25+ with `$(go env GOPATH)/bin` on `PATH`
- Node 24 (`nvm use`)
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@v2.17.0`
- golangci-lint v2: `go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest`
- Linux only: `sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev pkg-config gstreamer1.0-plugins-good gstreamer1.0-plugins-ugly gstreamer1.0-libav ffmpeg`. ffmpeg converts WebM recordings (e.g. from Firefox) to MP4.

Check your machine with `wails doctor`.

## Everyday commands

```bash
make install   # frontend dependencies
make dev       # run the app with hot reload
make check     # lint + all tests: run this before every commit
make help      # every target
```

## Recordings

Recordings are saved as `tmp/recording-YYYYMMDD-HHMMSS.mp4`, relative to the directory the app is started from (the repo root under `make dev`). Set `VERBLOOM_RECORDINGS_DIR` to save somewhere else. `tmp/` is git-ignored.

**Recording currently works in the browser only.** On Ubuntu 24.04 the desktop window can't record: WebKitGTK's MP4 recorder needs GStreamer's `isofmp4mux` plugin, which Ubuntu doesn't package. Run `make dev` and open http://localhost:34115 (the Wails server) in Chrome. Port 5173 is Vite's own server and has no Go backend.

## Docker

The Docker image is a reproducible Linux toolchain (Go, Node, Wails, GTK/WebKit). It is meant for checks and builds; it does not run the GUI.

```bash
make docker-check      # lint + tests in a container
make docker-bindings   # regenerate frontend/wailsjs
make docker-build      # Linux binary into build/bin
docker build --target artifact --output build/bin .   # same, without compose
```

## Project layout

See [CLAUDE.md](CLAUDE.md) for the layout and engineering rules, and `.claude/skills/` for the detailed Go and React/TypeScript standards.
