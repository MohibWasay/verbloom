// Package webview adjusts the native webview so the frontend can use the
// camera and microphone.
//
// Wails v2 on Linux leaves WebKitGTK's media-stream support disabled and
// denies every permission request, so getUserMedia always fails. On Linux
// builds with the webkit2_41 tag, EnableMediaCapture turns media capture
// on and grants camera/microphone requests to the app's own pages only.
// Other platforms prompt the user natively, so it is a no-op there.
package webview

import "net/url"

// trustedScheme is the scheme Wails serves the app from, in both
// production (wails://wails/) and dev (wails://wails.localhost:34115/).
const trustedScheme = "wails"

// isTrustedURI reports whether a page at uri may use the camera and
// microphone.
func isTrustedURI(uri string) bool {
	u, err := url.Parse(uri)
	if err != nil {
		return false
	}

	return u.Scheme == trustedScheme
}
