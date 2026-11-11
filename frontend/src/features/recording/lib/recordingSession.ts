import { type RecordingApi, recordingApi } from '../api/recordingApi';
import type { SavedRecording } from '../types';

import { createChunkUploader } from './chunkUploader';

/** How often MediaRecorder emits a chunk, which is then streamed to Go. */
export const TIMESLICE_MS = 1000;

export type RecordingSession = {
  /** The format actually being recorded. */
  mimeType: string;
  pause: () => void;
  resume: () => void;
  /** Stops recording, uploads the remaining data and saves the MP4. */
  stop: () => Promise<SavedRecording>;
  /** Stops recording and deletes everything recorded so far. */
  cancel: () => Promise<void>;
};

type CreateRecorder = (stream: MediaStream, mimeType: string) => MediaRecorder;

export type RecordingSessionOptions = {
  stream: MediaStream;
  /** Candidate formats, best first; the first one that starts is used. */
  mimeTypes: readonly string[];
  /** Called when recording or uploading fails mid-session. */
  onError: (error: unknown) => void;
  api?: RecordingApi;
  createRecorder?: CreateRecorder;
};

const defaultCreateRecorder: CreateRecorder = (stream, mimeType) =>
  new MediaRecorder(stream, { mimeType });

const ignore = (): void => undefined;

/** Starts recording the camera and streams it into a new Go session. */
export async function startRecordingSession({
  stream,
  mimeTypes,
  onError,
  api = recordingApi,
  createRecorder = defaultCreateRecorder,
}: RecordingSessionOptions): Promise<RecordingSession> {
  const { recorder, mimeType, chunks } = startFirstRecorder(stream, mimeTypes, createRecorder);
  const stopped = new Promise<void>((resolve) => {
    recorder.addEventListener('stop', () => {
      resolve();
    });
  });

  let sessionId: string;
  try {
    sessionId = await api.start(mimeType);
  } catch (error) {
    recorder.stop();
    throw error;
  }

  const uploader = createChunkUploader({
    send: (chunk) => api.appendChunk(sessionId, chunk),
    onError,
  });
  chunks.subscribe((chunk) => {
    uploader.enqueue(chunk);
  });
  recorder.addEventListener('error', (event) => {
    onError(event instanceof ErrorEvent ? event.error : new Error('Recording failed.'));
  });

  // MediaRecorder fires the final dataavailable before stop, so once
  // `stopped` resolves every chunk is already queued.
  const halt = async (): Promise<void> => {
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    await uploader.flush();
  };
  const discard = (): Promise<void> => api.discard(sessionId).catch(ignore);

  return {
    mimeType,
    pause: () => {
      if (recorder.state === 'recording') recorder.pause();
    },
    resume: () => {
      if (recorder.state === 'paused') recorder.resume();
    },
    stop: async () => {
      try {
        await halt();
        return await api.finish(sessionId);
      } catch (error) {
        await discard();
        throw error;
      }
    },
    cancel: async () => {
      await halt().catch(ignore);
      await discard();
    },
  };
}

/** Buffers chunks until a subscriber is attached, then forwards them. */
type ChunkBuffer = { subscribe: (listener: (chunk: Blob) => void) => void };

/**
 * Starts a recorder with the first candidate format the platform accepts.
 * Some engines report support in isTypeSupported but throw on start, so
 * actually starting is the only reliable test.
 */
function startFirstRecorder(
  stream: MediaStream,
  mimeTypes: readonly string[],
  createRecorder: CreateRecorder,
): { recorder: MediaRecorder; mimeType: string; chunks: ChunkBuffer } {
  let lastError: unknown = new Error('No supported recording format.');

  for (const mimeType of mimeTypes) {
    try {
      const recorder = createRecorder(stream, mimeType);
      const chunks = bufferChunks(recorder);
      recorder.start(TIMESLICE_MS);
      return { recorder, mimeType, chunks };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function bufferChunks(recorder: MediaRecorder): ChunkBuffer {
  const pending: Blob[] = [];
  let listener: ((chunk: Blob) => void) | null = null;

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size === 0) return;
    if (listener) listener(event.data);
    else pending.push(event.data);
  });

  return {
    subscribe: (next) => {
      listener = next;
      pending.splice(0).forEach(next);
    },
  };
}
