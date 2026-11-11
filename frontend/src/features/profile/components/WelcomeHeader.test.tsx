import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fetchProfile } from '../api/profileApi';

import { WelcomeHeader } from './WelcomeHeader';

vi.mock('../api/profileApi', () => ({ fetchProfile: vi.fn() }));

const fetchProfileMock = vi.mocked(fetchProfile);

describe('WelcomeHeader', () => {
  it('welcomes the user by display name', async () => {
    fetchProfileMock.mockResolvedValue({ username: 'ada', displayName: 'Ada Lovelace' });
    render(<WelcomeHeader />);

    expect(
      await screen.findByRole('heading', { name: 'Welcome, Ada Lovelace' }),
    ).toBeInTheDocument();
  });

  it('falls back to a generic welcome when the user cannot be loaded', async () => {
    fetchProfileMock.mockRejectedValue('look up current user: unknown');
    render(<WelcomeHeader />);

    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
  });
});
