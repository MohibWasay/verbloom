const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** Formats milliseconds as m:ss, or h:mm:ss from one hour. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  if (hours > 0) {
    return `${String(hours)}:${String(minutes).padStart(2, '0')}:${seconds}`;
  }
  return `${String(minutes)}:${seconds}`;
}

/** Formats a byte count with one decimal for KB and above (e.g. 2.4 MB). */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;

  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }

  const label = BYTE_UNITS[unit] ?? 'B';
  return unit === 0 ? `${String(value)} ${label}` : `${value.toFixed(1)} ${label}`;
}
