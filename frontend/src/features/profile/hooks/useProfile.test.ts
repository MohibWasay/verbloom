import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fetchProfile } from '../api/profileApi';

import { useProfile } from './useProfile';

vi.mock('../api/profileApi', () => ({ fetchProfile: vi.fn() }));

const fetchProfileMock = vi.mocked(fetchProfile);
const ada = { username: 'ada', displayName: 'Ada Lovelace' };

describe('useProfile', () => {
  it('starts loading, then exposes the profile', async () => {
    fetchProfileMock.mockResolvedValue(ada);
    const { result } = renderHook(() => useProfile());

    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', profile: ada });
    });
  });

  it('exposes the Go error message', async () => {
    fetchProfileMock.mockRejectedValue('look up current user: unknown');
    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'error',
        error: 'look up current user: unknown',
      });
    });
  });

  it('ignores a response that arrives after unmount', async () => {
    let resolve: (p: typeof ada) => void = () => undefined;
    fetchProfileMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, unmount } = renderHook(() => useProfile());

    unmount();
    resolve(ada);
    await Promise.resolve();

    expect(result.current).toEqual({ status: 'loading' });
  });
});
