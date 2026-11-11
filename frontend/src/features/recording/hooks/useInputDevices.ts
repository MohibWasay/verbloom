import { useEffect, useState } from 'react';

import { type InputDevice, toInputDevices } from '../lib/inputDevices';

export type InputDevices = {
  cameras: InputDevice[];
  microphones: InputDevice[];
};

const NONE: InputDevices = { cameras: [], microphones: [] };

/**
 * Lists cameras and microphones, refreshing when a device is plugged in
 * or removed and whenever `refreshKey` changes. Pass something that
 * changes once the camera opens: most engines only reveal device names
 * after permission.
 */
export function useInputDevices(refreshKey: unknown): InputDevices {
  const [devices, setDevices] = useState<InputDevices>(NONE);

  useEffect(() => {
    if (!('mediaDevices' in navigator)) return;

    const { mediaDevices } = navigator;
    let cancelled = false;
    const load = (): void => {
      mediaDevices.enumerateDevices().then(
        (list) => {
          if (cancelled) return;
          setDevices({
            cameras: toInputDevices(list, 'videoinput'),
            microphones: toInputDevices(list, 'audioinput'),
          });
        },
        () => undefined, // keep the last known list
      );
    };

    load();
    mediaDevices.addEventListener('devicechange', load);

    return () => {
      cancelled = true;
      mediaDevices.removeEventListener('devicechange', load);
    };
  }, [refreshKey]);

  return devices;
}
