import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFakeMediaDevices,
  createFakeStream,
  fakeDeviceInfo,
  type FakeMediaDevices,
} from '@/test/fakes/media';

import { CAMERA_UNAVAILABLE_MESSAGE } from '../lib/cameraErrors';
import { mediaConstraints } from '../lib/openMediaStream';

import { useCameraStream } from './useCameraStream';

describe('useCameraStream', () => {
  let mediaDevices: FakeMediaDevices;

  beforeEach(() => {
    mediaDevices = createFakeMediaDevices([
      fakeDeviceInfo('videoinput', 'cam-1', 'Integrated Webcam'),
      fakeDeviceInfo('videoinput', 'cam-2', 'UGREEN Camera'),
      fakeDeviceInfo('audioinput', 'mic-1', 'Built-in Microphone'),
      fakeDeviceInfo('audioinput', 'mic-2', 'Headset Microphone'),
    ]);
    vi.stubGlobal('navigator', { mediaDevices });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the default camera and microphone', async () => {
    const stream = createFakeStream('cam-1');
    mediaDevices.getUserMedia.mockResolvedValue(stream);
    const { result } = renderHook(() => useCameraStream());

    await act(() => result.current.open());

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith(mediaConstraints());
    expect(result.current.camera).toEqual({
      status: 'on',
      stream,
      devices: { cameraId: 'cam-1', microphoneId: 'mic-1' },
    });
  });

  it('opens exactly the requested devices', async () => {
    const devices = { cameraId: 'cam-2', microphoneId: 'mic-2' };
    const { result } = renderHook(() => useCameraStream());

    await act(() => result.current.open(devices));

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith(mediaConstraints(devices));
    expect(result.current.camera).toMatchObject({ status: 'on', devices });
  });

  it('switching devices stops the previous stream', async () => {
    const first = createFakeStream('cam-1');
    mediaDevices.getUserMedia.mockResolvedValueOnce(first);
    const { result } = renderHook(() => useCameraStream());
    await act(() => result.current.open({ cameraId: 'cam-1', microphoneId: 'mic-1' }));

    await act(() => result.current.open({ cameraId: 'cam-2', microphoneId: 'mic-1' }));

    first.tracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
    expect(result.current.camera).toMatchObject({
      status: 'on',
      devices: { cameraId: 'cam-2', microphoneId: 'mic-1' },
    });
  });

  it('is opening while permission is pending', () => {
    mediaDevices.getUserMedia.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useCameraStream());

    act(() => void result.current.open());

    expect(result.current.camera).toEqual({ status: 'opening' });
  });

  it('stops every track on close', async () => {
    const stream = createFakeStream();
    mediaDevices.getUserMedia.mockResolvedValue(stream);
    const { result } = renderHook(() => useCameraStream());
    await act(() => result.current.open());

    act(() => {
      result.current.close();
    });

    expect(result.current.camera).toEqual({ status: 'off' });
    stream.tracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
  });

  it('stops every track on unmount', async () => {
    const stream = createFakeStream();
    mediaDevices.getUserMedia.mockResolvedValue(stream);
    const { result, unmount } = renderHook(() => useCameraStream());
    await act(() => result.current.open());

    unmount();

    stream.tracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
  });

  it('stops a stream that arrives after the camera was closed', async () => {
    const late = createFakeStream();
    let resolve: (s: MediaStream) => void = () => undefined;
    mediaDevices.getUserMedia.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useCameraStream());

    act(() => void result.current.open());
    act(() => {
      result.current.close();
    });
    await act(async () => {
      resolve(late);
      await Promise.resolve();
    });

    expect(result.current.camera).toEqual({ status: 'off' });
    late.tracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
  });

  it('explains a denied permission', async () => {
    mediaDevices.getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const { result } = renderHook(() => useCameraStream());

    await act(() => result.current.open());

    expect(result.current.camera).toEqual({
      status: 'error',
      error: 'Camera or microphone access was denied.',
    });
  });

  it('ignores a failure from a superseded request', async () => {
    let reject: (e: unknown) => void = () => undefined;
    mediaDevices.getUserMedia.mockReturnValue(new Promise((_, r) => (reject = r)));
    const { result } = renderHook(() => useCameraStream());

    act(() => void result.current.open());
    act(() => {
      result.current.close();
    });
    await act(async () => {
      reject(new DOMException('denied', 'NotAllowedError'));
      await Promise.resolve();
    });

    expect(result.current.camera).toEqual({ status: 'off' });
  });

  it('reports when the window has no camera API', async () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useCameraStream());

    await act(() => result.current.open());

    expect(result.current.camera).toEqual({ status: 'error', error: CAMERA_UNAVAILABLE_MESSAGE });
  });
});
