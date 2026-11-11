import { CameraOff, LoaderCircle } from 'lucide-react';
import { type JSX, useEffect, useRef } from 'react';

type CameraPreviewProps = {
  stream: MediaStream | null;
  opening: boolean;
};

/** Live, mirrored, muted camera preview (the recording is not mirrored). */
export function CameraPreview({ stream, opening }: CameraPreviewProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
      {stream ? (
        <video
          ref={videoRef}
          aria-label="Camera preview"
          className="h-full w-full -scale-x-100 object-cover"
          autoPlay
          muted
          playsInline
        />
      ) : (
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2">
          {opening ? (
            <LoaderCircle className="size-10 animate-spin" aria-hidden />
          ) : (
            <CameraOff className="size-10" aria-hidden />
          )}
          <p>{opening ? 'Opening camera…' : 'Camera is off'}</p>
        </div>
      )}
    </div>
  );
}
