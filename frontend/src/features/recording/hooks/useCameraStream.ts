import { useCallback, useEffect, useRef, useState } from 'react';

import { CAMERA_UNAVAILABLE_MESSAGE, cameraErrorMessage } from '../lib/cameraErrors';
import type { DeviceSelection } from '../lib/inputDevices';
import { openMediaStream } from '../lib/openMediaStream';

export type CameraState =
  | { status: 'off' }
  | { status: 'opening' }
  | { status: 'on'; stream: MediaStream; devices: DeviceSelection }
  | { status: 'error'; error: string };

export type UseCameraStreamResult = {
  camera: CameraState;
  /** Opens (or switches) the camera and microphone; null IDs use the defaults. */
  open: (devices?: DeviceSelection) => Promise<void>;
  close: () => void;
};

const stopTracks = (stream: MediaStream): void => {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
};

/**
 * Owns the camera + microphone stream. Tracks are always stopped on close,
 * on unmount, and when a slower open() is superseded by a newer call.
 */
export function useCameraStream(): UseCameraStreamResult {
  const [camera, setCamera] = useState<CameraState>({ status: 'off' });
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);

  const release = useCallback(() => {
    requestRef.current++;
    if (streamRef.current) stopTracks(streamRef.current);
    streamRef.current = null;
  }, []);

  const open = useCallback(
    async (devices?: DeviceSelection) => {
      release();
      const request = requestRef.current;

      if (!('mediaDevices' in navigator)) {
        setCamera({ status: 'error', error: CAMERA_UNAVAILABLE_MESSAGE });
        return;
      }

      setCamera({ status: 'opening' });
      try {
        const opened = await openMediaStream(
          (constraints) => navigator.mediaDevices.getUserMedia(constraints),
          devices,
        );
        if (request !== requestRef.current) {
          stopTracks(opened.stream);
          return;
        }
        streamRef.current = opened.stream;
        setCamera({ status: 'on', ...opened });
      } catch (error) {
        if (request === requestRef.current) {
          setCamera({ status: 'error', error: cameraErrorMessage(error) });
        }
      }
    },
    [release],
  );

  const close = useCallback(() => {
    release();
    setCamera({ status: 'off' });
  }, [release]);

  useEffect(() => release, [release]);

  return { camera, open, close };
}
