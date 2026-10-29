# Verbloom

A desktop app for learning languages, built with [Wails v2](https://wails.io) (Go backend + React/TypeScript frontend via Vite).

## Prerequisites

- Go 1.22+
- Node.js 18+ and npm
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Linux only: `sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev pkg-config`

Run `wails doctor` to check your setup.

## Project layout

```
app.go          Go methods bound to the frontend
main.go         Wails app entry point and window options
frontend/       React + TypeScript (Vite) UI
build/          Icons and platform packaging assets
wails.json      Wails project config
```

## Development

```sh
wails dev                      # hot-reloading desktop app
wails dev -tags webkit2_41     # on Ubuntu 24.04+ (webkit2gtk 4.1)
```

A browser dev server with access to the Go bindings runs at http://localhost:34115.

## Build

```sh
wails build                    # add -tags webkit2_41 on Ubuntu 24.04+
```

The binary is written to `build/bin/`.
