// String.fromCharCode takes its bytes as arguments; slicing keeps us well
// under the engine's argument-count limit.
const SLICE_SIZE = 0x8000;

/** Encodes a Blob as standard base64 (no data: URL prefix). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += SLICE_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + SLICE_SIZE));
  }

  return btoa(binary);
}
