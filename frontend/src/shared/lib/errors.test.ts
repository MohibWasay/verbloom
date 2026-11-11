import { describe, expect, it } from 'vitest';

import { toErrorMessage } from './errors';

describe('toErrorMessage', () => {
  it.each([
    ['an Error', new Error('boom'), 'boom'],
    ['a DOMException', new DOMException('denied', 'NotAllowedError'), 'denied'],
    ['a string from a Go binding', 'name must not be empty', 'name must not be empty'],
    ['an empty Error', new Error(''), 'Something went wrong. Please try again.'],
    ['a blank string', '   ', 'Something went wrong. Please try again.'],
    ['an unknown value', { code: 42 }, 'Something went wrong. Please try again.'],
  ])('returns the right message for %s', (_label, input, expected) => {
    expect(toErrorMessage(input)).toBe(expected);
  });
});
