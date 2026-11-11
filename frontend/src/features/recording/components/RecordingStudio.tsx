import type { JSX } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

import { useCameraStream } from '../hooks/useCameraStream';
import { useInputDevices } from '../hooks/useInputDevices';
import { usePreferredDevices } from '../hooks/usePreferredDevices';
import { isRecorderBusy, useRecorder } from '../hooks/useRecorder';
import { useStopwatch } from '../hooks/useStopwatch';
import type { InputKind } from '../lib/inputDevices';

import { CameraPreview } from './CameraPreview';
import { DeviceSettings } from './DeviceSettings';
import { RecorderControls } from './RecorderControls';
import { RecordingFeedback } from './RecordingFeedback';
import { RecordingIndicator } from './RecordingIndicator';

/** Device pickers and camera preview plus record / pause / stop controls. */
export function RecordingStudio(): JSX.Element {
  const { camera, open, close } = useCameraStream();
  // Re-list devices when the camera state changes: names appear after permission.
  const devices = useInputDevices(camera.status);
  const { preferred, choose } = usePreferredDevices();
  // While the camera is on, show what is actually open, not just the preference.
  const selection = camera.status === 'on' ? camera.devices : preferred;
  const recorder = useRecorder();
  const { elapsedMs, reset } = useStopwatch(recorder.state.status === 'recording');
  const stream = camera.status === 'on' ? camera.stream : null;

  const handleStart = (): void => {
    if (!stream) return;
    reset();
    void recorder.start(stream);
  };

  const handleDeviceChange = (kind: InputKind, deviceId: string): void => {
    choose(kind, deviceId);
    if (camera.status !== 'on') return;
    const key = kind === 'videoinput' ? 'cameraId' : 'microphoneId';
    void open({ ...selection, [key]: deviceId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video recorder</CardTitle>
        <CardDescription>Recordings are saved as MP4 in the tmp folder.</CardDescription>
        <CardAction>
          <RecordingIndicator status={recorder.state.status} elapsedMs={elapsedMs} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <DeviceSettings
          devices={devices}
          selection={selection}
          disabled={camera.status === 'opening' || isRecorderBusy(recorder.state.status)}
          onChange={handleDeviceChange}
        />
        <CameraPreview stream={stream} opening={camera.status === 'opening'} />
        <RecordingFeedback camera={camera} recorder={recorder.state} />
      </CardContent>
      <CardFooter>
        <RecorderControls
          cameraStatus={camera.status}
          recorderStatus={recorder.state.status}
          onOpenCamera={() => void open(preferred)}
          onCloseCamera={close}
          onStart={handleStart}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onStop={() => void recorder.stop()}
        />
      </CardFooter>
    </Card>
  );
}
