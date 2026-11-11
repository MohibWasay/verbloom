import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFakeStream, FakeMediaRecorder } from '@/test/fakes/media';

import type { RecordingApi } from '../api/recordingApi';

import {
  type RecordingSessionOptions,
  startRecordingSession,
  TIMESLICE_MS,
} from './recordingSession';

const MP4 = 'video/mp4';
const WEBM = 'video/webm';
const saved = { path: '/repo/tmp/recording.mp4', fileName: 'recording.mp4', sizeBytes: 3 };

function createApi(): RecordingApi & { chunks: string[] } {
  const chunks: string[] = [];
  return {
    chunks,
    start: vi.fn().mockResolvedValue('session-1'),
    appendChunk: vi.fn((_id: string, chunk: string) => {
      chunks.push(atob(chunk));
      return Promise.resolve();
    }),
    finish: vi.fn().mockResolvedValue(saved),
    discard: vi.fn().mockResolvedValue(undefined),
  };
}

async function startSession(api: RecordingApi, overrides: Partial<RecordingSessionOptions> = {}) {
  const onError = vi.fn();
  const session = await startRecordingSession({
    stream: createFakeStream(),
    mimeTypes: [MP4, WEBM],
    onError,
    api,
    createRecorder: (stream, mimeType) =>
      new FakeMediaRecorder(stream, { mimeType }).asMediaRecorder(),
    ...overrides,
  });
  return { session, recorder: FakeMediaRecorder.latest(), onError };
}

describe('startRecordingSession', () => {
  beforeEach(() => {
    FakeMediaRecorder.reset();
  });

  it('records in the preferred format and opens a Go session for it', async () => {
    const api = createApi();
    const { session, recorder } = await startSession(api);

    expect(session.mimeType).toBe(MP4);
    expect(recorder.options).toEqual({ mimeType: MP4 });
    expect(recorder.start).toHaveBeenCalledWith(TIMESLICE_MS);
    expect(api.start).toHaveBeenCalledWith(MP4);
  });

  it('falls back to the next format when the platform refuses to start one', async () => {
    FakeMediaRecorder.failingMimeTypes.add(MP4);
    const api = createApi();

    const { session } = await startSession(api);

    expect(session.mimeType).toBe(WEBM);
    expect(api.start).toHaveBeenCalledWith(WEBM);
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('rejects with the last platform error when no format can start', async () => {
    FakeMediaRecorder.failingMimeTypes = new Set([MP4, WEBM]);
    const api = createApi();

    await expect(startSession(api)).rejects.toThrow(/unsupported on this platform/);
    expect(api.start).not.toHaveBeenCalled();
  });

  it('rejects when given no formats at all', async () => {
    await expect(startSession(createApi(), { mimeTypes: [] })).rejects.toThrow(
      'No supported recording format.',
    );
  });

  it('stops recording when Go refuses the session', async () => {
    const api = createApi();
    vi.mocked(api.start).mockRejectedValue('saving this recording as MP4 needs ffmpeg');

    await expect(startSession(api)).rejects.toBe('saving this recording as MP4 needs ffmpeg');
    expect(FakeMediaRecorder.latest().state).toBe('inactive');
  });

  it('keeps chunks produced before the Go session existed', async () => {
    const api = createApi();
    let resolveStart: (id: string) => void = () => undefined;
    vi.mocked(api.start).mockReturnValue(new Promise((r) => (resolveStart = r)));

    const pending = startSession(api);
    FakeMediaRecorder.latest().emitData('early');
    resolveStart('session-1');
    const { session, recorder } = await pending;
    recorder.emitData('late');
    await session.stop();

    expect(api.chunks).toEqual(['early', 'late', 'final']);
  });

  it('streams every chunk in order and saves on stop', async () => {
    const api = createApi();
    const { session, recorder } = await startSession(api);

    recorder.emitData('a');
    recorder.emitData('b');
    recorder.emitData('');

    await expect(session.stop()).resolves.toEqual(saved);
    expect(api.chunks).toEqual(['a', 'b', 'final']);
    expect(api.finish).toHaveBeenCalledWith('session-1');
    expect(api.discard).not.toHaveBeenCalled();
  });

  it('pauses and resumes only from the matching state', async () => {
    const { session, recorder } = await startSession(createApi());

    session.resume();
    expect(recorder.resume).not.toHaveBeenCalled();

    session.pause();
    session.pause();
    expect(recorder.pause).toHaveBeenCalledTimes(1);

    session.resume();
    expect(recorder.state).toBe('recording');
  });

  it('discards the session when saving fails', async () => {
    const api = createApi();
    vi.mocked(api.finish).mockRejectedValue('convert recording to MP4: ffmpeg failed');
    const { session } = await startSession(api);

    await expect(session.stop()).rejects.toBe('convert recording to MP4: ffmpeg failed');
    expect(api.discard).toHaveBeenCalledWith('session-1');
  });

  it('reports a failed upload and does not save', async () => {
    const api = createApi();
    vi.mocked(api.appendChunk).mockRejectedValue('write recording chunk: disk full');
    const { session, recorder, onError } = await startSession(api);

    recorder.emitData('a');

    await expect(session.stop()).rejects.toBe('write recording chunk: disk full');
    expect(onError).toHaveBeenCalledWith('write recording chunk: disk full');
    expect(api.finish).not.toHaveBeenCalled();
    expect(api.discard).toHaveBeenCalled();
  });

  it('reports recorder errors', async () => {
    const { recorder, onError } = await startSession(createApi());
    const failure = new Error('encoder crashed');

    recorder.dispatchEvent(new ErrorEvent('error', { error: failure }));
    recorder.dispatchEvent(new Event('error'));

    expect(onError).toHaveBeenNthCalledWith(1, failure);
    expect(onError).toHaveBeenNthCalledWith(2, new Error('Recording failed.'));
  });

  it('cancel stops recording and discards the data', async () => {
    const api = createApi();
    const { session, recorder } = await startSession(api);

    await session.cancel();

    expect(recorder.stop).toHaveBeenCalled();
    expect(api.discard).toHaveBeenCalledWith('session-1');
    expect(api.finish).not.toHaveBeenCalled();
  });
});
