import { activeDevices, type DeviceSelection } from './inputDevices';

/** `exact` must open that device; `ideal` lets the browser pick another. */
export type DeviceMatch = 'exact' | 'ideal';

const DEFAULT_DEVICES: DeviceSelection = { cameraId: null, microphoneId: null };

const deviceConstraint = (deviceId: string | null, match: DeviceMatch): MediaTrackConstraints =>
  deviceId ? { deviceId: { [match]: deviceId } } : {};

/**
 * 720p video plus voice-tuned audio. Echo cancellation stops speaker
 * output that the microphone picks up from being recorded twice.
 */
export function mediaConstraints(
  { cameraId, microphoneId }: DeviceSelection = DEFAULT_DEVICES,
  match: DeviceMatch = 'exact',
): MediaStreamConstraints {
  return {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, ...deviceConstraint(cameraId, match) },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...deviceConstraint(microphoneId, match),
    },
  };
}

export type OpenedStream = {
  stream: MediaStream;
  /** The devices in use, for showing in the pickers. */
  devices: DeviceSelection;
};

type GetUserMedia = (constraints: MediaStreamConstraints) => Promise<MediaStream>;

/**
 * Opens exactly the requested camera and microphone. Browsers treat an
 * `ideal` device as a hint and may open the default instead, so `exact`
 * is used first; only when a requested device is gone (unplugged) does
 * it retry with `ideal` so the closest available devices still open.
 */
export async function openMediaStream(
  getUserMedia: GetUserMedia,
  requested: DeviceSelection = DEFAULT_DEVICES,
): Promise<OpenedStream> {
  try {
    const stream = await getUserMedia(mediaConstraints(requested, 'exact'));
    const active = activeDevices(stream);
    // An exact match is the requested device, even if the browser reports
    // an alias such as "default" for it.
    return {
      stream,
      devices: {
        cameraId: requested.cameraId ?? active.cameraId,
        microphoneId: requested.microphoneId ?? active.microphoneId,
      },
    };
  } catch (error) {
    if (!isMissingDeviceError(error) || !requestsDevice(requested)) throw error;

    const stream = await getUserMedia(mediaConstraints(requested, 'ideal'));
    return { stream, devices: activeDevices(stream) };
  }
}

function requestsDevice({ cameraId, microphoneId }: DeviceSelection): boolean {
  return cameraId !== null || microphoneId !== null;
}

/** getUserMedia's errors for a device ID that no longer exists. */
function isMissingDeviceError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')
  );
}
