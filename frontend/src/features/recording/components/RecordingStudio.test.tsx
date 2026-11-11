import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFakeMediaDevices,
  createFakeStream,
  type FakeMediaDevices,
  FakeMediaRecorder,
  type FakeStream,
} from '@/test/fakes/media';

import { recordingApi } from '../api/recordingApi';

import { RecordingStudio } from './RecordingStudio';

vi.mock('../api/recordingApi', () => ({
  recordingApi: {
    start: vi.fn(),
    appendChunk: vi.fn(),
    finish: vi.fn(),
    discard: vi.fn(),
  },
}));

const api = vi.mocked(recordingApi);
const saved = {
  path: '/repo/tmp/recording-20261029-140509.mp4',
  fileName: 'recording-20261029-140509.mp4',
  sizeBytes: 2_516_582,
};

describe('RecordingStudio', () => {
  let stream: FakeStream;
  let mediaDevices: FakeMediaDevices;
  let getUserMedia: FakeMediaDevices['getUserMedia'];

  beforeEach(() => {
    FakeMediaRecorder.reset();
    localStorage.clear();
    stream = createFakeStream();
    mediaDevices = createFakeMediaDevices();
    getUserMedia = mediaDevices.getUserMedia;
    getUserMedia.mockResolvedValue(stream);
    vi.stubGlobal('navigator', { mediaDevices });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    api.start.mockResolvedValue('session-1');
    api.appendChunk.mockResolvedValue();
    api.finish.mockResolvedValue(saved);
    api.discard.mockResolvedValue();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const button = (name: RegExp): HTMLElement => screen.getByRole('button', { name });

  it('records, pauses, resumes and saves an MP4', async () => {
    const user = userEvent.setup();
    render(<RecordingStudio />);
    expect(screen.getByText('Camera is off')).toBeInTheDocument();

    await user.click(button(/open camera/i));
    expect(await screen.findByLabelText('Camera preview')).toBeInTheDocument();

    await user.click(button(/start recording/i));
    expect(await screen.findByText('REC')).toBeInTheDocument();
    expect(api.start).toHaveBeenCalledWith('video/mp4;codecs="avc1,mp4a"');

    await user.click(button(/pause/i));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    await user.click(button(/resume/i));
    expect(screen.getByText('REC')).toBeInTheDocument();

    FakeMediaRecorder.latest().emitData('chunk-1');
    await user.click(button(/stop/i));

    const alert = await screen.findByText('Recording saved');
    const savedAlert = within(alert.closest('[data-slot="alert"]') ?? document.body);
    expect(savedAlert.getByText(/recording-20261029-140509\.mp4 · 2\.4 MB/)).toBeInTheDocument();
    expect(savedAlert.getByText(saved.path)).toBeInTheDocument();
    expect(api.appendChunk).toHaveBeenCalledTimes(2);
    expect(api.finish).toHaveBeenCalledWith('session-1');
  });

  it('closes the camera and releases the device', async () => {
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await user.click(button(/open camera/i));
    await user.click(await screen.findByRole('button', { name: /close camera/i }));

    expect(screen.getByText('Camera is off')).toBeInTheDocument();
    stream.tracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
  });

  it('explains when camera access is denied', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await user.click(button(/open camera/i));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Camera or microphone access was denied.',
    );
  });

  it('falls back to WebM when the platform cannot start an MP4 recording', async () => {
    FakeMediaRecorder.failingMimeTypes = new Set([
      'video/mp4;codecs="avc1,mp4a"',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ]);
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await user.click(button(/open camera/i));
    await user.click(await screen.findByRole('button', { name: /start recording/i }));

    expect(await screen.findByText('REC')).toBeInTheDocument();
    expect(api.start).toHaveBeenCalledWith('video/webm;codecs="vp8,opus"');
  });

  it('shows the Go error when it cannot accept the recording', async () => {
    FakeMediaRecorder.failingMimeTypes = new Set(['video/mp4;codecs="avc1,mp4a"']);
    api.start.mockRejectedValue(
      'saving this recording as MP4 needs ffmpeg: install it (sudo apt install ffmpeg) and restart the app',
    );
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await user.click(button(/open camera/i));
    await user.click(await screen.findByRole('button', { name: /start recording/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sudo apt install ffmpeg/);
  });

  it('explains when video recording is not supported at all', async () => {
    FakeMediaRecorder.isTypeSupported.mockReturnValue(false);
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await user.click(button(/open camera/i));
    await user.click(await screen.findByRole('button', { name: /start recording/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot record video/i);
    expect(api.start).not.toHaveBeenCalled();
  });

  it('shows the Go error when saving fails, and allows recording again', async () => {
    api.finish.mockRejectedValue('recorded data is not a valid MP4 file');
    const user = userEvent.setup();
    render(<RecordingStudio />);

    await user.click(button(/open camera/i));
    await user.click(await screen.findByRole('button', { name: /start recording/i }));
    await user.click(await screen.findByRole('button', { name: /stop/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'recorded data is not a valid MP4 file',
    );
    expect(button(/start recording/i)).toBeEnabled();
  });
});
