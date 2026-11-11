import { type JSX, useId } from 'react';

import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

import type { InputDevice } from '../lib/inputDevices';

type DeviceSelectProps = {
  label: string;
  devices: InputDevice[];
  /** The selected device; null or unknown IDs show a placeholder. */
  value: string | null;
  disabled: boolean;
  onChange: (deviceId: string) => void;
};

/** Device picker; hidden until at least one device is known. */
export function DeviceSelect({
  label,
  devices,
  value,
  disabled,
  onChange,
}: DeviceSelectProps): JSX.Element | null {
  const id = useId();

  if (devices.length === 0) return null;

  const selected = devices.some((d) => d.deviceId === value) ? (value ?? '') : '';

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        size="sm"
        className="max-w-64"
        value={selected}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {selected === '' && (
          <NativeSelectOption value="" disabled>
            Choose a {label.toLowerCase()}
          </NativeSelectOption>
        )}
        {devices.map((device) => (
          <NativeSelectOption key={device.deviceId} value={device.deviceId}>
            {device.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
