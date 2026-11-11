import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { createFakeStream } from '@/test/fakes/media';

import type * as MimeTypeModule from '../lib/mimeType';
import { supportedMimeTypes, UNSUPPORTED_RECORDING_MESSAGE } from '../lib/mimeType';
import {
  type RecordingSession,
  type RecordingSessionOptions,
  startRecordingSession,
} from '../lib/recordingSession';

import { useRecorder } from './useRecorder';

vi.mock('../lib/mimeType', async (importOriginal) => ({
  ...(await importOriginal<typeof MimeTypeModule>()),
  supportedMimeTypes: vi.fn(),
}));
vi.mock('../lib/recordingSession', () => ({ startRecordingSession: vi.fn() }));

const saved = { path: '/repo/tmp/r.mp4', fileName: 'r.mp4', sizeBytes: 1 };

type FakeSession = { mimeType: string } & {
  [K in Exclude<keyof RecordingSession, 'mimeType'>]: Mock<RecordingSession[K]>;
};

function fakeSession(): FakeSession {
  return {
    mimeType: 'video/mp4',
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn<RecordingSession['stop']>().mockResolvedValue(saved),
    cancel: vi.fn<RecordingSession['cancel']>().mockResolvedValue(undefined),
  };
}

async function renderRecording(session = fakeSession()) {
  let options: RecordingSessionOptions | undefined;
  vi.mocked(startRecordingSession).mockImplementation((opts) => {
    options = opts;
    return Promise.resolve(session);
  });
  const hook = renderHook(() => useRecorder());
  await act(() => hook.result.current.start(createFakeStream()));
  return { ...hook, session, onError: (e: unknown) => options?.onError(e) };
}

describe('useRecorder', () => {
  beforeEach(() => {
    vi.mocked(supportedMimeTypes).mockReturnValue(['video/mp4', 'video/webm']);
  });

  it('starts idle', () => {
    expect(renderHook(() => useRecorder()).result.current.state).toEqual({ status: 'idle' });
  });

  it('records with the supported formats', async () => {
    const { result } = await renderRecording();

    expect(result.current.state).toEqual({ status: 'recording' });
    expect(vi.mocked(startRecordingSession).mock.calls[0]?.[0].mimeTypes).toEqual([
      'video/mp4',
      'video/webm',
    ]);
  });

  it('refuses to start when no format is supported', async () => {
    vi.mocked(supportedMimeTypes).mockReturnValue([]);
    const { result } = renderHook(() => useRecorder());

    await act(() => result.current.start(createFakeStream()));

    expect(result.current.state).toEqual({ status: 'error', error: UNSUPPORTED_RECORDING_MESSAGE });
    expect(startRecordingSession).not.toHaveBeenCalled();
  });

  it('reports a failure to start', async () => {
    vi.mocked(startRecordingSession).mockRejectedValue('create recordings directory: denied');
    const { result } = renderHook(() => useRecorder());

    await act(() => result.current.start(createFakeStream()));

    expect(result.current.state).toEqual({
      status: 'error',
      error: 'create recordings directory: denied',
    });
  });

  it('pauses and resumes', async () => {
    const { result, session } = await renderRecording();

    act(() => {
      result.current.pause();
    });
    expect(result.current.state).toEqual({ status: 'paused' });
    expect(session.pause).toHaveBeenCalled();

    act(() => {
      result.current.resume();
    });
    expect(result.current.state).toEqual({ status: 'recording' });
    expect(session.resume).toHaveBeenCalled();
  });

  it('saves on stop', async () => {
    const { result } = await renderRecording();

    await act(() => result.current.stop());

    expect(result.current.state).toEqual({ status: 'saved', recording: saved });
  });

  it('reports a failed save', async () => {
    const session = fakeSession();
    session.stop.mockRejectedValue('recorded data is not a valid MP4 file');
    const { result } = await renderRecording(session);

    await act(() => result.current.stop());

    expect(result.current.state).toEqual({
      status: 'error',
      error: 'recorded data is not a valid MP4 file',
    });
  });

  it('ignores stop when nothing is recording', async () => {
    const { result } = renderHook(() => useRecorder());

    await act(() => result.current.stop());

    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('cancels and reports an error raised mid-recording', async () => {
    const { result, session, onError } = await renderRecording();

    act(() => {
      onError('write recording chunk: disk full');
    });

    expect(session.cancel).toHaveBeenCalled();
    expect(result.current.state).toEqual({
      status: 'error',
      error: 'write recording chunk: disk full',
    });
  });

  it('cancels the recording on unmount', async () => {
    const { unmount, session } = await renderRecording();

    unmount();

    expect(session.cancel).toHaveBeenCalled();
  });

  it('cancels a session that finishes starting after unmount', async () => {
    const session = fakeSession();
    let resolve: (s: RecordingSession) => void = () => undefined;
    vi.mocked(startRecordingSession).mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, unmount } = renderHook(() => useRecorder());

    act(() => void result.current.start(createFakeStream()));
    unmount();
    await act(async () => {
      resolve(session);
      await Promise.resolve();
    });

    expect(session.cancel).toHaveBeenCalled();
  });
});
