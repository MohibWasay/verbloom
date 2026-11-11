const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Normalises anything thrown or rejected into a user-facing message.
 * Wails rejects binding promises with the Go error string, so strings are
 * passed through as-is.
 */
export function toErrorMessage(error: unknown): string {
  // DOMException is not an Error subclass in every engine (e.g. jsdom).
  if ((error instanceof Error || error instanceof DOMException) && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return FALLBACK_MESSAGE;
}
