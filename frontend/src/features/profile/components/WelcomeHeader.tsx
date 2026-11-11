import type { JSX } from 'react';

import { useProfile } from '../hooks/useProfile';

export function WelcomeHeader(): JSX.Element {
  const state = useProfile();
  const name = state.status === 'ready' ? state.profile.displayName : null;

  return (
    <header className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">
        {name ? `Welcome, ${name}` : 'Welcome'}
      </h1>
      <p className="text-muted-foreground">
        Open your camera, hit record, and your video is saved as an MP4.
      </p>
    </header>
  );
}
