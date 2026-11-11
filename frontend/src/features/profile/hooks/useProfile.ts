import { useEffect, useState } from 'react';

import { toErrorMessage } from '@/shared/lib/errors';

import { fetchProfile } from '../api/profileApi';
import type { Profile } from '../types';

export type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; error: string };

/** Loads the current user once on mount. */
export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchProfile().then(
      (profile) => {
        if (!cancelled) setState({ status: 'ready', profile });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toErrorMessage(error) });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
