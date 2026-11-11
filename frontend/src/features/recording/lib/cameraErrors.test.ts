import { describe, expect, it } from 'vitest';

import { cameraErrorMessage } from './cameraErrors';

describe('cameraErrorMessage', () => {
  it.each([
    ['NotAllowedError', 'Camera or microphone access was denied.'],
    ['NotFoundError', 'No camera or microphone was found.'],
    ['NotReadableError', 'The camera or microphone is already in use by another application.'],
    ['OverconstrainedError', 'The camera does not support the requested resolution.'],
  ])('explains %s', (name, expected) => {
    expect(cameraErrorMessage(new DOMException('raw', name))).toBe(expected);
  });

  it('falls back to the DOMException message for other names', () => {
    expect(cameraErrorMessage(new DOMException('Something odd', 'AbortError'))).toBe(
      'Something odd',
    );
  });

  it('handles non-DOMException errors', () => {
    expect(cameraErrorMessage(new Error('boom'))).toBe('boom');
  });
});
