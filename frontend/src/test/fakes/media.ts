import { vi } from 'vitest';

/**
 * Minimal MediaRecorder for jsdom, which has none. Tests drive it with
 * emitData()/stop() the way the browser would.
 */
export class FakeMediaRecorder extends EventTarget {
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported = vi.fn((type: string) => type.startsWith('video/'));
  /** Formats whose start() throws, like MP4 on WebKitGTK without isofmp4mux. */
  static failingMimeTypes = new Set<string>();

  state: RecordingState = 'inactive';
  readonly start = vi.fn((timeslice?: number) => {
    if (FakeMediaRecorder.failingMimeTypes.has(this.options?.mimeType ?? '')) {
      throw new DOMException(
        'The MediaRecorder is unsupported on this platform',
        'NotSupportedError',
      );
    }
    this.timeslice = timeslice;
    this.state = 'recording';
  });
  readonly pause = vi.fn(() => {
    this.state = 'paused';
  });
  readonly resume = vi.fn(() => {
    this.state = 'recording';
  });
  readonly stop = vi.fn(() => {
    this.state = 'inactive';
    this.emitData('final');
    this.dispatchEvent(new Event('stop'));
  });
  timeslice: number | undefined;
  readonly stream: MediaStream;
  readonly options: MediaRecorderOptions | undefined;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    super();
    this.stream = stream;
    this.options = options;
    FakeMediaRecorder.instances.push(this);
  }

  static latest(): FakeMediaRecorder {
    const recorder = FakeMediaRecorder.instances.at(-1);
    if (!recorder) throw new Error('No FakeMediaRecorder was created');
    return recorder;
  }

  static reset(): void {
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.failingMimeTypes = new Set();
    FakeMediaRecorder.isTypeSupported.mockImplementation((type) => type.startsWith('video/'));
  }

  emitData(text: string): void {
    const event = new Event('dataavailable') as Event & { data: Blob };
    event.data = new Blob([text]);
    this.dispatchEvent(event);
  }

  asMediaRecorder(): MediaRecorder {
    return this as unknown as MediaRecorder;
  }
}

type FakeTrack = { kind: 'video' | 'audio'; stop: ReturnType<typeof vi.fn> };

export type FakeStream = MediaStream & { tracks: FakeTrack[] };

/** A MediaStream stand-in whose tracks record stop() calls. */
export function createFakeStream(cameraId = 'cam-1', microphoneId = 'mic-1'): FakeStream {
  const video = {
    kind: 'video' as const,
    stop: vi.fn(),
    getSettings: () => ({ deviceId: cameraId }),
  };
  const audio = {
    kind: 'audio' as const,
    stop: vi.fn(),
    getSettings: () => ({ deviceId: microphoneId }),
  };
  const tracks = [video, audio];
  return {
    tracks,
    getTracks: () => tracks,
    getVideoTracks: () => [video],
    getAudioTracks: () => [audio],
  } as unknown as FakeStream;
}

export function fakeDeviceInfo(
  kind: MediaDeviceKind,
  deviceId: string,
  label: string,
): MediaDeviceInfo {
  return { kind, deviceId, label, groupId: '', toJSON: () => ({}) };
}

export type FakeMediaDevices = EventTarget & {
  getUserMedia: ReturnType<typeof vi.fn<(c: MediaStreamConstraints) => Promise<MediaStream>>>;
  enumerateDevices: ReturnType<typeof vi.fn<() => Promise<MediaDeviceInfo[]>>>;
  /** Replaces the device list and fires devicechange, like a USB plug-in. */
  plug: (devices: MediaDeviceInfo[]) => void;
};

/**
 * navigator.mediaDevices stand-in. getUserMedia opens the requested camera
 * and microphone (or the first listed ones), so the stream reports
 * realistic device IDs.
 */
export function createFakeMediaDevices(devices: MediaDeviceInfo[] = []): FakeMediaDevices {
  let current = devices;
  const target = new EventTarget() as FakeMediaDevices;

  const pick = (constraint: boolean | MediaTrackConstraints | undefined, kind: MediaDeviceKind) => {
    const deviceId = typeof constraint === 'object' ? constraint.deviceId : undefined;
    const { exact, ideal } = (deviceId ?? {}) as ConstrainDOMStringParameters;
    if (typeof exact === 'string') {
      if (!current.some((d) => d.kind === kind && d.deviceId === exact)) {
        throw new DOMException(`No ${kind} with ID ${exact}`, 'OverconstrainedError');
      }
      return exact;
    }
    const preferred = typeof ideal === 'string' ? ideal : undefined;
    const available = current.filter((d) => d.kind === kind);
    return available.find((d) => d.deviceId === preferred)?.deviceId ?? available[0]?.deviceId;
  };

  target.enumerateDevices = vi.fn(() => Promise.resolve(current));
  // A throw inside the executor (unknown exact device) rejects the promise.
  target.getUserMedia = vi.fn(
    (constraints: MediaStreamConstraints) =>
      new Promise<MediaStream>((resolve) => {
        resolve(
          createFakeStream(
            pick(constraints.video, 'videoinput') ?? 'cam-1',
            pick(constraints.audio, 'audioinput') ?? 'mic-1',
          ),
        );
      }),
  );
  target.plug = (next) => {
    current = next;
    target.dispatchEvent(new Event('devicechange'));
  };

  return target;
}
