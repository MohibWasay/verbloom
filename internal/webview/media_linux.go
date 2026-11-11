//go:build linux && webkit2_41

package webview

/*
#cgo pkg-config: gtk+-3.0 webkit2gtk-4.1
#include <glib.h>

void verbloom_schedule_enable_media_capture(void);
*/
import "C"

// EnableMediaCapture turns on camera/microphone support in every Wails
// webview. It is safe to call from any goroutine once the window exists
// (e.g. from OnDomReady); the work is scheduled on the GTK main thread.
func EnableMediaCapture() {
	C.verbloom_schedule_enable_media_capture()
}

//export verbloomIsTrustedURI
func verbloomIsTrustedURI(uri *C.char) C.gboolean {
	if isTrustedURI(C.GoString(uri)) {
		return 1 // TRUE
	}

	return 0 // FALSE
}
