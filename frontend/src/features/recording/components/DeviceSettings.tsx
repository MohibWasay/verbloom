import type { JSX } from 'react';

import type { InputDevices } from '../hooks/useInputDevices';
import type { DeviceSelection, InputKind } from '../lib/inputDevices';

import { DeviceSelect } from './DeviceSelect';

type DeviceSettingsProps = {
  devices: InputDevices;
  selection: DeviceSelection;
  disabled: boolean;
  onChange: (kind: InputKind, deviceId: string) => void;
};

/** Camera and microphone pickers. */
export function DeviceSettings({
  devices,
  selection,
  disabled,
  onChange,
}: DeviceSettingsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <DeviceSelect
        label="Camera"
        devices={devices.cameras}
        value={selection.cameraId}
        disabled={disabled}
        onChange={(deviceId) => {
          onChange('videoinput', deviceId);
        }}
      />
      <DeviceSelect
        label="Microphone"
        devices={devices.microphones}
        value={selection.microphoneId}
        disabled={disabled}
        onChange={(deviceId) => {
          onChange('audioinput', deviceId);
        }}
      />
    </div>
  );
}
