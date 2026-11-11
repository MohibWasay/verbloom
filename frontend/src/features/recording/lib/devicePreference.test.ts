import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEVICE_PREFERENCE_KEYS,
  loadPreferredDeviceId,
  savePreferredDeviceId,
} from './devicePreference';

describe('device preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is empty until a device is chosen', () => {
    expect(loadPreferredDeviceId('videoinput')).toBeNull();
    expect(loadPreferredDeviceId('audioinput')).toBeNull();
  });

  it('remembers cameras and microphones separately', () => {
    savePreferredDeviceId('videoinput', 'cam-2');
    savePreferredDeviceId('audioinput', 'mic-2');

    expect(loadPreferredDeviceId('videoinput')).toBe('cam-2');
    expect(loadPreferredDeviceId('audioinput')).toBe('mic-2');
  });

  it('keeps the camera key used by earlier versions', () => {
    expect(DEVICE_PREFERENCE_KEYS.videoinput).toBe('verbloom.cameraDeviceId');
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    expect(() => {
      savePreferredDeviceId('audioinput', 'mic-2');
    }).not.toThrow();
    expect(loadPreferredDeviceId('audioinput')).toBeNull();
  });
});
