export type InputKind = 'videoinput' | 'audioinput';

export type InputDevice = {
  deviceId: string;
  label: string;
};

/** The camera and microphone to open; null means the system default. */
export type DeviceSelection = {
  cameraId: string | null;
  microphoneId: string | null;
};

const FALLBACK_LABEL: Readonly<Record<InputKind, string>> = {
  videoinput: 'Camera',
  audioinput: 'Microphone',
};

/**
 * Keeps the devices of one kind from an enumerateDevices() result.
 * Devices without an ID (listed before permission is granted) are
 * dropped, duplicates removed, and unnamed ones labelled "Camera N" /
 * "Microphone N".
 */
export function toInputDevices(
  devices: readonly MediaDeviceInfo[],
  kind: InputKind,
): InputDevice[] {
  const result: InputDevice[] = [];
  const seen = new Set<string>();

  for (const device of devices) {
    if (device.kind !== kind || !device.deviceId || seen.has(device.deviceId)) continue;
    seen.add(device.deviceId);
    const fallback = `${FALLBACK_LABEL[kind]} ${String(result.length + 1)}`;
    result.push({ deviceId: device.deviceId, label: device.label || fallback });
  }

  return result;
}

/** The devices a stream is actually using (they may differ from the request). */
export function activeDevices(stream: MediaStream): DeviceSelection {
  return {
    cameraId: stream.getVideoTracks()[0]?.getSettings().deviceId ?? null,
    microphoneId: stream.getAudioTracks()[0]?.getSettings().deviceId ?? null,
  };
}
