/**
 * Recording formats in order of preference. MP4 is saved as-is; WebM is
 * converted to MP4 by Go (WebKitGTK on most Linux distros can only record
 * WebM, and claims MP4 support it cannot deliver).
 */
export const RECORDING_MIME_TYPES = [
  'video/mp4;codecs="avc1,mp4a"',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs="vp8,opus"',
  'video/webm',
] as const;

export const UNSUPPORTED_RECORDING_MESSAGE =
  'This system cannot record video. On Linux, install gstreamer1.0-plugins-good, gstreamer1.0-plugins-ugly and gstreamer1.0-libav, then restart the app.';

/**
 * Returns every recording format the browser claims to support, best
 * first. `isSupported` defaults to MediaRecorder.isTypeSupported.
 */
export function supportedMimeTypes(
  isSupported: (type: string) => boolean = defaultIsSupported,
): string[] {
  return RECORDING_MIME_TYPES.filter((type) => isSupported(type));
}

function defaultIsSupported(type: string): boolean {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type);
}
