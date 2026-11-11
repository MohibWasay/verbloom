import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFakeMediaDevices,
  fakeDeviceInfo,
  type FakeMediaDevices,
  FakeMediaRecorder,
} from '@/test/fakes/media';

import { recordingApi } from '../api/recordingApi';
import { DEVICE_PREFERENCE_KEYS } from '../lib/devicePreference';

import { RecordingStudio } from './RecordingStudio';

vi.mock('../api/recordingApi', () => ({
  recordingApi: { start: vi.fn(), appendChunk: vi.fn(), finish: vi.fn(), discard: vi.fn() },
}));

const laptopCam = fakeDeviceInfo('videoinput', 'cam-1', 'Integrated Webcam');
const ugreen = fakeDeviceInfo('videoinput', 'cam-2', 'UGREEN Camera');
const builtInMic = fakeDeviceInfo('audioinput', 'mic-1', 'Built-in Microphone');
const headset = fakeDeviceInfo('audioinput', 'mic-2', 'Headset Microphone');

describe('RecordingStudio device switching', () => {
  let mediaDevices: FakeMediaDevices;

  beforeEach(() => {
    FakeMediaRecorder.reset();
    localStorage.clear();
    mediaDevices = createFakeMediaDevices([laptopCam, ugreen, builtInMic, headset]);
    vi.stubGlobal('navigator', { mediaDevices });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.mocked(recordingApi.start).mockResolvedValue('session-1');
    vi.mocked(recordingApi.discard).mockResolvedValue();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const select = (label: string): Promise<HTMLElement> => screen.findByLabelText(label);
  const lastRequest = (): MediaStreamConstraints | undefined =>
    mediaDevices.getUserMedia.mock.lastCall?.[0];
  const requested = (kind: 'video' | 'audio'): unknown =>
    (lastRequest()?.[kind] as MediaTrackConstraints).deviceId;
  const openCamera = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
    await user.click(screen.getByRole('button', { name: /open camera/i }));
    await waitFor(async () => {
      expect(await select('Camera')).toHaveValue('cam-1');
    });
  };

  it('switches the live preview to the chosen webcam, keeping the microphone', async () => {
    const user = userEvent.setup();
    render(<RecordingStudio />);
    await openCamera(user);

    await user.selectOptions(await select('Camera'), 'UGREEN Camera');

    expect(requested('video')).toEqual({ exact: 'cam-2' });
    expect(requested('audio')).toEqual({ exact: 'mic-1' });
    await waitFor(async () => {
      expect(await select('Camera')).toHaveValue('cam-2');
    });
  });

  it('switches to the headset microphone with echo cancellation, keeping the camera', async () => {
    const user = userEvent.setup();
    render(<RecordingStudio />);
    await openCamera(user);

    await user.selectOptions(await select('Microphone'), 'Headset Microphone');

    expect(requested('audio')).toEqual({ exact: 'mic-2' });
    expect(lastRequest()?.audio).toMatchObject({ echoCancellation: true });
    expect(requested('video')).toEqual({ exact: 'cam-1' });
    await waitFor(async () => {
      expect(await select('Microphone')).toHaveValue('mic-2');
    });
  });

  it('remembers both devices and opens them next time', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RecordingStudio />);
    await user.selectOptions(await select('Camera'), 'UGREEN Camera');
    await user.selectOptions(await select('Microphone'), 'Headset Microphone');
    expect(localStorage.getItem(DEVICE_PREFERENCE_KEYS.audioinput)).toBe('mic-2');
    unmount();

    render(<RecordingStudio />);
    await user.click(screen.getByRole('button', { name: /open camera/i }));

    expect(requested('video')).toEqual({ exact: 'cam-2' });
    expect(requested('audio')).toEqual({ exact: 'mic-2' });
  });

  it('falls back to the default microphone when the remembered headset is unplugged', async () => {
    localStorage.setItem(DEVICE_PREFERENCE_KEYS.audioinput, 'mic-gone');
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await openCamera(user);

    expect(requested('audio')).toEqual({ ideal: 'mic-gone' });
    expect(await select('Microphone')).toHaveValue('mic-1');
  });

  it('choosing devices while the camera is off does not open it', async () => {
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await user.selectOptions(await select('Microphone'), 'Headset Microphone');

    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByText('Camera is off')).toBeInTheDocument();
  });

  it('locks both pickers while recording', async () => {
    const user = userEvent.setup();
    render(<RecordingStudio />);
    await openCamera(user);
    await user.click(await screen.findByRole('button', { name: /start recording/i }));

    await screen.findByText('REC');

    expect(await select('Camera')).toBeDisabled();
    expect(await select('Microphone')).toBeDisabled();
  });

  it('shows a newly plugged-in headset', async () => {
    mediaDevices.plug([laptopCam, builtInMic]);
    render(<RecordingStudio />);
    await screen.findByRole('option', { name: 'Built-in Microphone' });

    mediaDevices.plug([laptopCam, builtInMic, headset]);

    expect(await screen.findByRole('option', { name: 'Headset Microphone' })).toBeInTheDocument();
  });
});
