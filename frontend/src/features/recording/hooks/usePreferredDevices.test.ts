import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEVICE_PREFERENCE_KEYS } from '../lib/devicePreference';

import { usePreferredDevices } from './usePreferredDevices';

describe('usePreferredDevices', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the system defaults until devices are chosen', () => {
    const { result } = renderHook(() => usePreferredDevices());

    expect(result.current.preferred).toEqual({ cameraId: null, microphoneId: null });
  });

  it('starts from the remembered devices', () => {
    localStorage.setItem(DEVICE_PREFERENCE_KEYS.videoinput, 'cam-2');
    localStorage.setItem(DEVICE_PREFERENCE_KEYS.audioinput, 'mic-2');

    const { result } = renderHook(() => usePreferredDevices());

    expect(result.current.preferred).toEqual({ cameraId: 'cam-2', microphoneId: 'mic-2' });
  });

  it('changes one device without touching the other', () => {
    const { result } = renderHook(() => usePreferredDevices());

    act(() => {
      result.current.choose('videoinput', 'cam-2');
    });
    act(() => {
      result.current.choose('audioinput', 'mic-2');
    });

    expect(result.current.preferred).toEqual({ cameraId: 'cam-2', microphoneId: 'mic-2' });
  });

  it('remembers choices across restarts', () => {
    const { result } = renderHook(() => usePreferredDevices());

    act(() => {
      result.current.choose('audioinput', 'mic-2');
    });

    expect(renderHook(() => usePreferredDevices()).result.current.preferred.microphoneId).toBe(
      'mic-2',
    );
  });
});
