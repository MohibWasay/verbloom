import { describe, expect, it, vi } from 'vitest';

import { createChunkUploader } from './chunkUploader';

const blob = (text: string): Blob => new Blob([text]);

describe('createChunkUploader', () => {
  it('sends chunks as base64 in the order they were queued', async () => {
    const sent: string[] = [];
    const send = vi.fn(async (chunk: string) => {
      // The first chunk is slowest; order must still be preserved.
      await new Promise((r) => setTimeout(r, chunk === btoa('a') ? 20 : 0));
      sent.push(atob(chunk));
    });
    const uploader = createChunkUploader({ send });

    uploader.enqueue(blob('a'));
    uploader.enqueue(blob('b'));
    uploader.enqueue(blob('c'));
    await uploader.flush();

    expect(sent).toEqual(['a', 'b', 'c']);
  });

  it('resolves flush immediately when nothing was queued', async () => {
    const uploader = createChunkUploader({ send: vi.fn() });

    await expect(uploader.flush()).resolves.toBeUndefined();
  });

  it('reports the first failure once and drops later chunks', async () => {
    const send = vi.fn().mockRejectedValueOnce('disk full').mockResolvedValue(undefined);
    const onError = vi.fn();
    const uploader = createChunkUploader({ send, onError });

    uploader.enqueue(blob('a'));
    uploader.enqueue(blob('b'));

    await expect(uploader.flush()).rejects.toBe('disk full');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('disk full');
    expect(send).toHaveBeenCalledTimes(1);
  });
});
