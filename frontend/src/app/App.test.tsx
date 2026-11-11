import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('@wailsjs/go/profile/Service', () => ({
  Current: vi.fn().mockResolvedValue({ username: 'ada', displayName: 'Ada Lovelace' }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('go', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('welcomes the user and shows the recorder', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Welcome, Ada Lovelace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Video recorder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open camera/i })).toBeInTheDocument();
  });
});
