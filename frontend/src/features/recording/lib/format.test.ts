import { describe, expect, it } from 'vitest';

import { formatBytes, formatDuration } from './format';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [999, '0:00'],
    [1_000, '0:01'],
    [65_000, '1:05'],
    [3_599_000, '59:59'],
    [3_600_000, '1:00:00'],
    [3_725_000, '1:02:05'],
    [-5_000, '0:00'],
  ])('formats %d ms as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1_024, '1.0 KB'],
    [2_516_582, '2.4 MB'],
    [5 * 1024 ** 3, '5.0 GB'],
    [3 * 1024 ** 4, '3072.0 GB'],
    [-1, '0 B'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
