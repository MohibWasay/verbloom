import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFakeMediaDevices, fakeDeviceInfo, type FakeMediaDevices } from '@/test/fakes/media';

import { useInputDevices } from './useInputDevices';

const laptopCam = fakeDeviceInfo('videoinput', 'cam-1', 'Integrated Webcam');
const builtInMic = fakeDeviceInfo('audioinput', 'mic-1', 'Built-in Microphone');
const headset = fakeDeviceInfo('audioinput', 'mic-2', 'Headset Microphone');

describe('useInputDevices', () => {
  let mediaDevices: FakeMediaDevices;

  beforeEach(() => {
    mediaDevices = createFakeMediaDevices([laptopCam, builtInMic]);
    vi.stubGlobal('navigator', { mediaDevices });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists cameras and microphones separately', async () => {
    const { result } = renderHook(() => useInputDevices('off'));

    await waitFor(() => {
      expect(result.current).toEqual({
        cameras: [{ deviceId: 'cam-1', label: 'Integrated Webcam' }],
        microphones: [{ deviceId: 'mic-1', label: 'Built-in Microphone' }],
      });
    });
  });

  it('picks up a headset that is plugged in', async () => {
    const { result } = renderHook(() => useInputDevices('on'));
    await waitFor(() => {
      expect(result.current.microphones).toHaveLength(1);
    });

    act(() => {
      mediaDevices.plug([laptopCam, builtInMic, headset]);
    });

    await waitFor(() => {
      expect(result.current.microphones.map((d) => d.label)).toEqual([
        'Built-in Microphone',
        'Headset Microphone',
      ]);
    });
  });

  it('re-lists when the refresh key changes', async () => {
    const { rerender } = renderHook(({ key }) => useInputDevices(key), {
      initialProps: { key: 'off' },
    });
    await waitFor(() => {
      expect(mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1);
    });

    rerender({ key: 'on' });

    await waitFor(() => {
      expect(mediaDevices.enumerateDevices).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the last list when enumeration fails', async () => {
    const { result, rerender } = renderHook(({ key }) => useInputDevices(key), {
      initialProps: { key: 'off' },
    });
    await waitFor(() => {
      expect(result.current.cameras).toHaveLength(1);
    });

    mediaDevices.enumerateDevices.mockRejectedValueOnce(new Error('busy'));
    rerender({ key: 'on' });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.cameras).toHaveLength(1);
  });

  it('stops listening after unmount', async () => {
    const remove = vi.spyOn(mediaDevices, 'removeEventListener');
    const { unmount } = renderHook(() => useInputDevices('off'));
    await waitFor(() => {
      expect(mediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    unmount();

    expect(remove).toHaveBeenCalledWith('devicechange', expect.any(Function));
  });

  it('returns nothing when the window has no media API', () => {
    vi.stubGlobal('navigator', {});

    const { result } = renderHook(() => useInputDevices('off'));

    expect(result.current).toEqual({ cameras: [], microphones: [] });
  });
});
