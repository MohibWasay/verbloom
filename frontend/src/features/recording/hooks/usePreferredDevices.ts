import { useCallback, useState } from 'react';

import { loadPreferredDeviceId, savePreferredDeviceId } from '../lib/devicePreference';
import type { DeviceSelection, InputKind } from '../lib/inputDevices';

export type UsePreferredDevicesResult = {
  /** The remembered camera and microphone; null means the system default. */
  preferred: DeviceSelection;
  choose: (kind: InputKind, deviceId: string) => void;
};

/** The user's camera and microphone choices, persisted across restarts. */
export function usePreferredDevices(): UsePreferredDevicesResult {
  const [preferred, setPreferred] = useState<DeviceSelection>(() => ({
    cameraId: loadPreferredDeviceId('videoinput'),
    microphoneId: loadPreferredDeviceId('audioinput'),
  }));

  const choose = useCallback((kind: InputKind, deviceId: string) => {
    savePreferredDeviceId(kind, deviceId);
    setPreferred((current) =>
      kind === 'videoinput'
        ? { ...current, cameraId: deviceId }
        : { ...current, microphoneId: deviceId },
    );
  }, []);

  return { preferred, choose };
}
