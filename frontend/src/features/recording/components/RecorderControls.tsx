import { Camera, CameraOff, Circle, LoaderCircle, Pause, Play, Square } from 'lucide-react';
import type { JSX } from 'react';

import { Button } from '@/shared/ui/button';

import type { CameraState } from '../hooks/useCameraStream';
import type { RecorderState } from '../hooks/useRecorder';

export type RecorderControlsProps = {
  cameraStatus: CameraState['status'];
  recorderStatus: RecorderState['status'];
  onOpenCamera: () => void;
  onCloseCamera: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function RecorderControls(props: RecorderControlsProps): JSX.Element {
  return <div className="flex flex-wrap gap-2">{renderButtons(props)}</div>;
}

function renderButtons(props: RecorderControlsProps): JSX.Element {
  if (props.cameraStatus !== 'on') {
    return <OpenCameraButton {...props} />;
  }

  switch (props.recorderStatus) {
    case 'recording':
    case 'paused':
      return <ActiveButtons {...props} />;
    case 'starting':
    case 'saving':
      return (
        <Button disabled>
          <LoaderCircle className="animate-spin" aria-hidden />
          {props.recorderStatus === 'starting' ? 'Starting…' : 'Saving…'}
        </Button>
      );
    case 'idle':
    case 'saved':
    case 'error':
      return (
        <>
          <Button onClick={props.onStart}>
            <Circle className="fill-red-500 text-red-500" aria-hidden />
            Start recording
          </Button>
          <Button variant="outline" onClick={props.onCloseCamera}>
            <CameraOff aria-hidden />
            Close camera
          </Button>
        </>
      );
  }
}

function OpenCameraButton(props: RecorderControlsProps): JSX.Element {
  const opening = props.cameraStatus === 'opening';

  return (
    <Button onClick={props.onOpenCamera} disabled={opening}>
      <Camera aria-hidden />
      {opening ? 'Opening camera…' : 'Open camera'}
    </Button>
  );
}

function ActiveButtons(props: RecorderControlsProps): JSX.Element {
  const paused = props.recorderStatus === 'paused';

  return (
    <>
      <Button variant="secondary" onClick={paused ? props.onResume : props.onPause}>
        {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        {paused ? 'Resume' : 'Pause'}
      </Button>
      <Button variant="destructive" onClick={props.onStop}>
        <Square aria-hidden />
        Stop
      </Button>
    </>
  );
}
