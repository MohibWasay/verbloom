import { afterEach, describe, expect, it, vi } from 'vitest';

import { RECORDING_MIME_TYPES, supportedMimeTypes } from './mimeType';

describe('supportedMimeTypes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists MP4 before WebM', () => {
    expect(supportedMimeTypes(() => true)).toEqual([...RECORDING_MIME_TYPES]);
  });

  it('keeps only supported types, in preference order', () => {
    const supported = new Set(['video/webm', 'video/mp4']);

    expect(supportedMimeTypes((type) => supported.has(type))).toEqual(['video/mp4', 'video/webm']);
  });

  it('returns nothing when no format is supported', () => {
    expect(supportedMimeTypes(() => false)).toEqual([]);
  });

  it('uses MediaRecorder.isTypeSupported by default', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (t: string) => t === 'video/webm' });

    expect(supportedMimeTypes()).toEqual(['video/webm']);
  });

  it('returns nothing when MediaRecorder does not exist', () => {
    vi.stubGlobal('MediaRecorder', undefined);

    expect(supportedMimeTypes()).toEqual([]);
  });
});
