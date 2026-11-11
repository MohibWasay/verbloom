import { AppendChunk, Discard, Finish, Start } from '@wailsjs/go/recording/Service';

import { callGo } from '@/shared/lib/backend';

import type { SavedRecording } from '../types';

/** The Go recording service. Every call rejects with the Go error message. */
export type RecordingApi = {
  start: (mimeType: string) => Promise<string>;
  appendChunk: (sessionId: string, base64Chunk: string) => Promise<void>;
  finish: (sessionId: string) => Promise<SavedRecording>;
  discard: (sessionId: string) => Promise<void>;
};

export const recordingApi: RecordingApi = {
  start: (mimeType) => callGo(() => Start(mimeType)),
  appendChunk: (sessionId, base64Chunk) => callGo(() => AppendChunk(sessionId, base64Chunk)),
  finish: async (sessionId) => {
    const { path, fileName, sizeBytes } = await callGo(() => Finish(sessionId));
    return { path, fileName, sizeBytes };
  },
  discard: (sessionId) => callGo(() => Discard(sessionId)),
};
