//go:build !(linux && webkit2_41)

package webview

// EnableMediaCapture is a no-op: macOS and Windows webviews prompt the
// user for camera access themselves.
func EnableMediaCapture() {}
