//go:build linux && webkit2_41

// Native half of media_linux.go. Runs on the GTK main thread.

#include <gtk/gtk.h>
#include <webkit2/webkit2.h>

#include "_cgo_export.h"

static gboolean on_permission_request(WebKitWebView *view, WebKitPermissionRequest *request, gpointer data) {
	if (!WEBKIT_IS_USER_MEDIA_PERMISSION_REQUEST(request)) {
		return FALSE; // not ours: keep WebKit's default handling
	}
	const gchar *uri = webkit_web_view_get_uri(view);
	if (uri != NULL && verbloomIsTrustedURI((char *)uri)) {
		webkit_permission_request_allow(request);
	} else {
		webkit_permission_request_deny(request);
	}
	return TRUE;
}

static void enable_media_recorder(WebKitSettings *settings) {
#if WEBKIT_CHECK_VERSION(2, 42, 0)
	WebKitFeatureList *features = webkit_settings_get_all_features();
	for (gsize i = 0; i < webkit_feature_list_get_length(features); i++) {
		WebKitFeature *feature = webkit_feature_list_get(features, i);
		const gchar *id = webkit_feature_get_identifier(feature);
		// MP4 recording needs GStreamer's isofmp4mux, which many distros
		// (e.g. Ubuntu 24.04) lack; WebM works with stock plugins.
		if (g_strcmp0(id, "MediaRecorderEnabled") == 0 || g_strcmp0(id, "MediaRecorderEnabledWebM") == 0) {
			webkit_settings_set_feature_enabled(settings, feature, TRUE);
		}
	}
	webkit_feature_list_unref(features);
#endif
}

static WebKitWebView *find_web_view(GtkWidget *widget) {
	if (WEBKIT_IS_WEB_VIEW(widget)) {
		return WEBKIT_WEB_VIEW(widget);
	}
	if (!GTK_IS_CONTAINER(widget)) {
		return NULL;
	}
	WebKitWebView *found = NULL;
	GList *children = gtk_container_get_children(GTK_CONTAINER(widget));
	for (GList *l = children; l != NULL && found == NULL; l = l->next) {
		found = find_web_view(GTK_WIDGET(l->data));
	}
	g_list_free(children);
	return found;
}

static void configure_web_view(WebKitWebView *view) {
	if (g_object_get_data(G_OBJECT(view), "verbloom-media") != NULL) {
		return; // already configured
	}
	WebKitSettings *settings = webkit_web_view_get_settings(view);
	webkit_settings_set_enable_media_stream(settings, TRUE);
	enable_media_recorder(settings);
	g_signal_connect(view, "permission-request", G_CALLBACK(on_permission_request), NULL);
	g_object_set_data(G_OBJECT(view), "verbloom-media", GINT_TO_POINTER(1));
}

// Runs on the GTK main thread via g_idle_add.
static gboolean enable_media_capture(gpointer data) {
	GList *windows = gtk_window_list_toplevels();
	for (GList *l = windows; l != NULL; l = l->next) {
		WebKitWebView *view = find_web_view(GTK_WIDGET(l->data));
		if (view != NULL) {
			configure_web_view(view);
		}
	}
	g_list_free(windows);
	return G_SOURCE_REMOVE;
}

void verbloom_schedule_enable_media_capture(void) {
	g_idle_add(enable_media_capture, NULL);
}
