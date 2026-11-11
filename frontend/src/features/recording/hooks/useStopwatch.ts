import { useCallback, useEffect, useRef, useState } from 'react';

export const TICK_MS = 250;

export type UseStopwatchResult = {
  elapsedMs: number;
  reset: () => void;
};

/** Counts time while `running` is true; pausing keeps the total so far. */
export function useStopwatch(running: boolean): UseStopwatchResult {
  const [elapsedMs, setElapsedMs] = useState(0);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (!running) return;

    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsedMs(accumulatedRef.current + Date.now() - startedAt);
    }, TICK_MS);

    return () => {
      clearInterval(id);
      accumulatedRef.current += Date.now() - startedAt;
      setElapsedMs(accumulatedRef.current);
    };
  }, [running]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    setElapsedMs(0);
  }, []);

  return { elapsedMs, reset };
}
