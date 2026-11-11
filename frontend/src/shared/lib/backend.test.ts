import { afterEach, describe, expect, it, vi } from 'vitest';

import { BACKEND_UNAVAILABLE_MESSAGE, callGo, hasGoBackend } from './backend';

describe('callGo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the binding when Wails is present', async () => {
    vi.stubGlobal('go', {});

    expect(hasGoBackend()).toBe(true);
    await expect(callGo(() => Promise.resolve(42))).resolves.toBe(42);
  });

  it('explains how to connect when Wails is missing', async () => {
    const call = vi.fn();

    expect(hasGoBackend()).toBe(false);
    await expect(callGo(call)).rejects.toThrow(BACKEND_UNAVAILABLE_MESSAGE);
    expect(call).not.toHaveBeenCalled();
  });
});
