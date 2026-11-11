import type { InputKind } from './inputDevices';

export const DEVICE_PREFERENCE_KEYS: Readonly<Record<InputKind, string>> = {
  videoinput: 'verbloom.cameraDeviceId',
  audioinput: 'verbloom.microphoneDeviceId',
};

// Storage can be missing or throw (private mode, blocked site data); the
// preference is a convenience, so failures are ignored.

/** The device of this kind the user last chose, if remembered. */
export function loadPreferredDeviceId(kind: InputKind): string | null {
  try {
    return localStorage.getItem(DEVICE_PREFERENCE_KEYS[kind]);
  } catch {
    return null;
  }
}

/** Remembers the user's device choice for next time. */
export function savePreferredDeviceId(kind: InputKind, deviceId: string): void {
  try {
    localStorage.setItem(DEVICE_PREFERENCE_KEYS[kind], deviceId);
  } catch {
    // Not remembered; the default device is used next time.
  }
}
