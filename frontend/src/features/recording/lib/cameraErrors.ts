import { toErrorMessage } from '@/shared/lib/errors';

export const CAMERA_UNAVAILABLE_MESSAGE = 'Camera access is not available in this window.';

const MESSAGES_BY_NAME: Readonly<Record<string, string>> = {
  NotAllowedError: 'Camera or microphone access was denied.',
  NotFoundError: 'No camera or microphone was found.',
  NotReadableError: 'The camera or microphone is already in use by another application.',
  OverconstrainedError: 'The camera does not support the requested resolution.',
};

/** Turns a getUserMedia failure into a message a user can act on. */
export function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    return MESSAGES_BY_NAME[error.name] ?? toErrorMessage(error);
  }
  return toErrorMessage(error);
}
