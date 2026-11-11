import { describe, expect, it } from 'vitest';

import { blobToBase64 } from './base64';

describe('blobToBase64', () => {
  it('encodes text', async () => {
    await expect(blobToBase64(new Blob(['hello']))).resolves.toBe('aGVsbG8=');
  });

  it('encodes binary bytes', async () => {
    const blob = new Blob([new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0xff])]);

    await expect(blobToBase64(blob)).resolves.toBe('AAAAGGZ0eXD/');
  });

  it('encodes an empty blob', async () => {
    await expect(blobToBase64(new Blob([]))).resolves.toBe('');
  });

  it('encodes blobs larger than one slice', async () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256);

    const encoded = await blobToBase64(new Blob([bytes]));

    expect(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))).toEqual(bytes);
  });
});
