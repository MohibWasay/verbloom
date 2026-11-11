import { describe, expect, it } from 'vitest';

import { createFakeStream, fakeDeviceInfo } from '@/test/fakes/media';

import { activeDevices, toInputDevices } from './inputDevices';

const devices = [
  fakeDeviceInfo('videoinput', 'cam-1', 'Integrated Webcam'),
  fakeDeviceInfo('audioinput', 'mic-1', 'Built-in Microphone'),
  fakeDeviceInfo('videoinput', 'cam-2', 'UGREEN Camera'),
  fakeDeviceInfo('audioinput', 'mic-2', 'Headset Microphone'),
  fakeDeviceInfo('audiooutput', 'spk-1', 'Speakers'),
];

describe('toInputDevices', () => {
  it('keeps only cameras', () => {
    expect(toInputDevices(devices, 'videoinput')).toEqual([
      { deviceId: 'cam-1', label: 'Integrated Webcam' },
      { deviceId: 'cam-2', label: 'UGREEN Camera' },
    ]);
  });

  it('keeps only microphones', () => {
    expect(toInputDevices(devices, 'audioinput')).toEqual([
      { deviceId: 'mic-1', label: 'Built-in Microphone' },
      { deviceId: 'mic-2', label: 'Headset Microphone' },
    ]);
  });

  it.each([
    ['videoinput', ['Camera 1', 'Camera 2']],
    ['audioinput', ['Microphone 1', 'Microphone 2']],
  ] as const)('names unlabelled %s devices by position', (kind, labels) => {
    const unnamed = [fakeDeviceInfo(kind, 'a', ''), fakeDeviceInfo(kind, 'b', '')];

    expect(toInputDevices(unnamed, kind).map((d) => d.label)).toEqual(labels);
  });

  it('drops devices listed without an ID and duplicates', () => {
    const list = [
      fakeDeviceInfo('audioinput', '', ''),
      fakeDeviceInfo('audioinput', 'mic-1', 'Headset'),
      fakeDeviceInfo('audioinput', 'mic-1', 'Headset'),
    ];

    expect(toInputDevices(list, 'audioinput')).toEqual([{ deviceId: 'mic-1', label: 'Headset' }]);
  });
});

describe('activeDevices', () => {
  it('reads the camera and microphone from the track settings', () => {
    expect(activeDevices(createFakeStream('cam-2', 'mic-2'))).toEqual({
      cameraId: 'cam-2',
      microphoneId: 'mic-2',
    });
  });

  it('returns nulls for a stream without tracks', () => {
    const empty = { getVideoTracks: () => [], getAudioTracks: () => [] } as unknown as MediaStream;

    expect(activeDevices(empty)).toEqual({ cameraId: null, microphoneId: null });
  });
});
