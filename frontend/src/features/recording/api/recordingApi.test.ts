import { recording } from '@wailsjs/go/models';
import { AppendChunk, Discard, Finish, Start } from '@wailsjs/go/recording/Service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recordingApi } from './recordingApi';

vi.mock('@wailsjs/go/recording/Service', () => ({
  Start: vi.fn(),
  AppendChunk: vi.fn(),
  Finish: vi.fn(),
  Discard: vi.fn(),
}));

describe('recordingApi', () => {
  beforeEach(() => {
    vi.stubGlobal('go', {});
  });

  it('starts a session with the MIME type', async () => {
    vi.mocked(Start).mockResolvedValue('session-1');

    await expect(recordingApi.start('video/mp4')).resolves.toBe('session-1');
    expect(Start).toHaveBeenCalledWith('video/mp4');
  });

  it('appends a chunk to the session', async () => {
    vi.mocked(AppendChunk).mockResolvedValue();

    await recordingApi.appendChunk('session-1', 'AAAA');

    expect(AppendChunk).toHaveBeenCalledWith('session-1', 'AAAA');
  });

  it('maps the finished recording to a plain object', async () => {
    const saved = { path: '/repo/tmp/r.mp4', fileName: 'r.mp4', sizeBytes: 42 };
    vi.mocked(Finish).mockResolvedValue(recording.Recording.createFrom(saved));

    await expect(recordingApi.finish('session-1')).resolves.toStrictEqual(saved);
  });

  it('discards the session', async () => {
    vi.mocked(Discard).mockResolvedValue();

    await recordingApi.discard('session-1');

    expect(Discard).toHaveBeenCalledWith('session-1');
  });

  it('propagates Go errors', async () => {
    vi.mocked(Start).mockRejectedValue('recording must be MP4 (video/mp4)');

    await expect(recordingApi.start('video/webm')).rejects.toBe(
      'recording must be MP4 (video/mp4)',
    );
  });
});
