package webview

import "testing"

func TestIsTrustedURI(t *testing.T) {
	t.Parallel()

	tests := []struct {
		uri  string
		want bool
	}{
		{uri: "wails://wails/", want: true},
		{uri: "wails://wails.localhost:34115/", want: true},
		{uri: "wails://wails/index.html#/record", want: true},
		{uri: "https://example.com/", want: false},
		{uri: "http://wails.localhost:34115/", want: false},
		{uri: "file:///etc/passwd", want: false},
		{uri: "about:blank", want: false},
		{uri: "", want: false},
		{uri: "://bad", want: false},
	}

	for _, tt := range tests {
		if got := isTrustedURI(tt.uri); got != tt.want {
			t.Errorf("isTrustedURI(%q) = %v, want %v", tt.uri, got, tt.want)
		}
	}
}
