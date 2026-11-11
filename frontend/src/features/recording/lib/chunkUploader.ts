import { blobToBase64 } from './base64';

export type ChunkUploader = {
  /** Queues a chunk; chunks are sent strictly in the order queued. */
  enqueue: (chunk: Blob) => void;
  /** Resolves once every queued chunk is sent; rejects if any failed. */
  flush: () => Promise<void>;
};

type ChunkUploaderOptions = {
  send: (base64Chunk: string) => Promise<void>;
  /** Called once, on the first failed chunk. Later chunks are dropped. */
  onError?: (error: unknown) => void;
};

/** Sends recorder chunks to Go one at a time, preserving their order. */
export function createChunkUploader({ send, onError }: ChunkUploaderOptions): ChunkUploader {
  let queue: Promise<void> = Promise.resolve();
  let failure: { error: unknown } | null = null;

  const upload = async (chunk: Blob): Promise<void> => {
    if (failure) return;
    try {
      await send(await blobToBase64(chunk));
    } catch (error) {
      failure = { error };
      onError?.(error);
    }
  };

  return {
    enqueue: (chunk) => {
      queue = queue.then(() => upload(chunk));
    },
    flush: async () => {
      await queue;
      if (failure) throw failure.error;
    },
  };
}
