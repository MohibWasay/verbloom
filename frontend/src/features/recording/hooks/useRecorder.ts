import { useCallback, useEffect, useRef, useState } from 'react';

import { toErrorMessage } from '@/shared/lib/errors';

import { supportedMimeTypes, UNSUPPORTED_RECORDING_MESSAGE } from '../lib/mimeType';
import { type RecordingSession, startRecordingSession } from '../lib/recordingSession';
import type { SavedRecording } from '../types';

export type RecorderState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'recording' }
  | { status: 'paused' }
  | { status: 'saving' }
  | { status: 'saved'; recording: SavedRecording }
  | { status: 'error'; error: string };

/** True while a recording is starting, running, paused or being saved. */
export function isRecorderBusy(status: RecorderState['status']): boolean {
  return (
    status === 'starting' || status === 'recording' || status === 'paused' || status === 'saving'
  );
}

export type UseRecorderResult = {
  state: RecorderState;
  start: (stream: MediaStream) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
};

/** Drives one recording at a time and exposes its state to the UI. */
export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecorderState>({ status: 'idle' });
  const sessionRef = useRef<RecordingSession | null>(null);
  const disposedRef = useRef(false);

  const fail = useCallback((error: unknown) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    void session?.cancel();
    setState({ status: 'error', error: toErrorMessage(error) });
  }, []);

  const start = useCallback(
    async (stream: MediaStream) => {
      const mimeTypes = supportedMimeTypes();
      if (mimeTypes.length === 0) {
        setState({ status: 'error', error: UNSUPPORTED_RECORDING_MESSAGE });
        return;
      }

      setState({ status: 'starting' });
      try {
        const session = await startRecordingSession({ stream, mimeTypes, onError: fail });
        if (disposedRef.current) {
          void session.cancel();
          return;
        }
        sessionRef.current = session;
        setState({ status: 'recording' });
      } catch (error) {
        setState({ status: 'error', error: toErrorMessage(error) });
      }
    },
    [fail],
  );

  const pause = useCallback(() => {
    sessionRef.current?.pause();
    setState((s) => (s.status === 'recording' ? { status: 'paused' } : s));
  }, []);

  const resume = useCallback(() => {
    sessionRef.current?.resume();
    setState((s) => (s.status === 'paused' ? { status: 'recording' } : s));
  }, []);

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;

    setState({ status: 'saving' });
    try {
      setState({ status: 'saved', recording: await session.stop() });
    } catch (error) {
      setState({ status: 'error', error: toErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      void sessionRef.current?.cancel();
      sessionRef.current = null;
    };
  }, []);

  return { state, start, pause, resume, stop };
}
