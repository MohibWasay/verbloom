import { Current } from '@wailsjs/go/profile/Service';

import { callGo } from '@/shared/lib/backend';

import type { Profile } from '../types';

/** Loads the operating-system user running the app. */
export async function fetchProfile(): Promise<Profile> {
  const { username, displayName } = await callGo(() => Current());
  return { username, displayName };
}
