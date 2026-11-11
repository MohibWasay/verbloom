import type { JSX } from 'react';

import { Badge } from '@/shared/ui/badge';

import type { RecorderState } from '../hooks/useRecorder';
import { formatDuration } from '../lib/format';

type RecordingIndicatorProps = {
  status: RecorderState['status'];
  elapsedMs: number;
};

/** "REC 0:12" while recording, "Paused 0:12" while paused, else nothing. */
export function RecordingIndicator({
  status,
  elapsedMs,
}: RecordingIndicatorProps): JSX.Element | null {
  if (status !== 'recording' && status !== 'paused') return null;

  const recording = status === 'recording';

  return (
    <Badge variant={recording ? 'destructive' : 'secondary'} className="gap-2 tabular-nums">
      <span
        className={recording ? 'size-2 animate-pulse rounded-full bg-white' : 'hidden'}
        aria-hidden
      />
      {recording ? 'REC' : 'Paused'}
      <time>{formatDuration(elapsedMs)}</time>
    </Badge>
  );
}
