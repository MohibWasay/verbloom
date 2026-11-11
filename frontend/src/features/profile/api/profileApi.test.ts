import { profile } from '@wailsjs/go/models';
import { Current } from '@wailsjs/go/profile/Service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchProfile } from './profileApi';

vi.mock('@wailsjs/go/profile/Service', () => ({ Current: vi.fn() }));

const currentMock = vi.mocked(Current);

describe('fetchProfile', () => {
  beforeEach(() => {
    vi.stubGlobal('go', {});
  });

  it('maps the Go profile to a plain object', async () => {
    currentMock.mockResolvedValue(
      profile.Profile.createFrom({ username: 'ada', displayName: 'Ada Lovelace' }),
    );

    await expect(fetchProfile()).resolves.toStrictEqual({
      username: 'ada',
      displayName: 'Ada Lovelace',
    });
  });

  it('propagates the Go error', async () => {
    currentMock.mockRejectedValue('look up current user: unknown');

    await expect(fetchProfile()).rejects.toBe('look up current user: unknown');
  });
});
