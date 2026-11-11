// Command verbloom starts the Verbloom desktop application.
package main

import (
	"embed"
	"io/fs"
	"log"
	"os"

	"github.com/wailsapp/wails/v2"

	"verbloom/internal/app"
)

//go:embed all:frontend/dist
var embedded embed.FS

func main() {
	cfg, err := app.ConfigFromEnv(os.Getenv)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	assets, err := fs.Sub(embedded, "frontend/dist")
	if err != nil {
		log.Fatalf("load frontend assets: %v", err)
	}

	if err := wails.Run(app.New(cfg).Options(assets)); err != nil {
		log.Fatalf("run application: %v", err)
	}
}
