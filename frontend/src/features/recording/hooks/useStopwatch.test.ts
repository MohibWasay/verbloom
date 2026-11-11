import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStopwatch } from './useStopwatch';

describe('useStopwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number): void => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  it('stays at zero while not running', () => {
    const { result } = renderHook(() => useStopwatch(false));

    advance(5_000);

    expect(result.current.elapsedMs).toBe(0);
  });

  it('counts while running', () => {
    const { result } = renderHook(() => useStopwatch(true));

    advance(3_000);

    expect(result.current.elapsedMs).toBe(3_000);
  });

  it('keeps the total across a pause', () => {
    const { result, rerender } = renderHook(({ running }) => useStopwatch(running), {
      initialProps: { running: true },
    });

    advance(2_100);
    rerender({ running: false });
    advance(10_000);

    expect(result.current.elapsedMs).toBe(2_100);

    rerender({ running: true });
    advance(1_000);

    expect(result.current.elapsedMs).toBe(3_100);
  });

  it('reset returns to zero', () => {
    const { result, rerender } = renderHook(({ running }) => useStopwatch(running), {
      initialProps: { running: true },
    });
    advance(2_000);
    rerender({ running: false });

    act(() => {
      result.current.reset();
    });

    expect(result.current.elapsedMs).toBe(0);
  });
});
