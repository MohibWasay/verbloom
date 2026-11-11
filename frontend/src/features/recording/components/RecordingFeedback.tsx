import { CircleAlert, CircleCheck } from 'lucide-react';
import type { JSX } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';

import type { CameraState } from '../hooks/useCameraStream';
import type { RecorderState } from '../hooks/useRecorder';
import { formatBytes } from '../lib/format';

type RecordingFeedbackProps = {
  camera: CameraState;
  recorder: RecorderState;
};

/** Camera/recording errors and the saved-file confirmation. */
export function RecordingFeedback({ camera, recorder }: RecordingFeedbackProps): JSX.Element {
  return (
    <div aria-live="polite" className="space-y-3">
      {camera.status === 'error' && <ErrorAlert title="Camera unavailable" error={camera.error} />}
      {recorder.status === 'error' && (
        <ErrorAlert title="Recording failed" error={recorder.error} />
      )}
      {recorder.status === 'saved' && (
        <Alert>
          <CircleCheck aria-hidden />
          <AlertTitle>Recording saved</AlertTitle>
          <AlertDescription>
            <p>
              {recorder.recording.fileName} · {formatBytes(recorder.recording.sizeBytes)}
            </p>
            <code className="text-xs break-all">{recorder.recording.path}</code>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function ErrorAlert({ title, error }: { title: string; error: string }): JSX.Element {
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
