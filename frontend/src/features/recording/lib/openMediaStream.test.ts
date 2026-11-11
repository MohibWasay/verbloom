import { describe, expect, it, vi } from 'vitest';

import { createFakeStream } from '@/test/fakes/media';

import { mediaConstraints, openMediaStream } from './openMediaStream';

const chosen = { cameraId: 'cam-2', microphoneId: 'mic-2' };

describe('mediaConstraints', () => {
  it('asks for 720p video and echo-cancelled audio from the default devices', () => {
    expect(mediaConstraints()).toEqual({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  });

  it('requires the chosen devices by default', () => {
    const constraints = mediaConstraints(chosen);

    expect(constraints.video).toMatchObject({ deviceId: { exact: 'cam-2' } });
    expect(constraints.audio).toMatchObject({
      deviceId: { exact: 'mic-2' },
      echoCancellation: true,
    });
  });

  it('can prefer the chosen devices instead of requiring them', () => {
    const constraints = mediaConstraints(chosen, 'ideal');

    expect(constraints.video).toMatchObject({ deviceId: { ideal: 'cam-2' } });
    expect(constraints.audio).toMatchObject({ deviceId: { ideal: 'mic-2' } });
  });

  it('only constrains the devices that were chosen', () => {
    const constraints = mediaConstraints({ cameraId: null, microphoneId: 'mic-2' });

    expect(constraints.video).not.toHaveProperty('deviceId');
    expect(constraints.audio).toMatchObject({ deviceId: { exact: 'mic-2' } });
  });
});

describe('openMediaStream', () => {
  it('opens exactly the chosen devices', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(createFakeStream('cam-2', 'mic-2'));

    const opened = await openMediaStream(getUserMedia, chosen);

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith(mediaConstraints(chosen, 'exact'));
    expect(opened.devices).toEqual(chosen);
  });

  it('shows the chosen device even when the browser reports an alias like "default"', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(createFakeStream('cam-2', 'default'));

    const opened = await openMediaStream(getUserMedia, chosen);

    expect(opened.devices.microphoneId).toBe('mic-2');
  });

  it('reports what opened for devices left to the system default', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(createFakeStream('cam-1', 'mic-1'));

    const opened = await openMediaStream(getUserMedia);

    expect(opened.devices).toEqual({ cameraId: 'cam-1', microphoneId: 'mic-1' });
  });

  it.each(['OverconstrainedError', 'NotFoundError'])(
    'falls back to the closest devices when a chosen one is gone (%s)',
    async (name) => {
      const fallback = createFakeStream('cam-2', 'mic-1');
      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(new DOMException('gone', name))
        .mockResolvedValueOnce(fallback);

      const opened = await openMediaStream(getUserMedia, chosen);

      expect(getUserMedia).toHaveBeenLastCalledWith(mediaConstraints(chosen, 'ideal'));
      expect(opened).toEqual({
        stream: fallback,
        devices: { cameraId: 'cam-2', microphoneId: 'mic-1' },
      });
    },
  );

  it('does not retry other failures', async () => {
    const denied = new DOMException('denied', 'NotAllowedError');
    const getUserMedia = vi.fn().mockRejectedValue(denied);

    await expect(openMediaStream(getUserMedia, chosen)).rejects.toBe(denied);
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it('does not retry when no device was chosen', async () => {
    const missing = new DOMException('no camera', 'NotFoundError');
    const getUserMedia = vi.fn().mockRejectedValue(missing);

    await expect(openMediaStream(getUserMedia)).rejects.toBe(missing);
    expect(getUserMedia).toHaveBeenCalledOnce();
  });
});
