# Frontend testing patterns

Run: `npm test` · watch: `npm run test:watch` · coverage: `npm run test:coverage` (all from `frontend/`). Tests run in jsdom; `src/test/setup.ts` loads jest-dom matchers and cleans up after each test.

## Component test

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { recordingApi } from '../api/recordingApi';

import { RecordingStudio } from './RecordingStudio';

vi.mock('../api/recordingApi', () => ({
  recordingApi: { start: vi.fn(), appendChunk: vi.fn(), finish: vi.fn(), discard: vi.fn() },
}));
const api = vi.mocked(recordingApi);

describe('RecordingStudio', () => {
  beforeEach(() => {
    FakeMediaRecorder.reset();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(createFakeStream()) } });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    api.start.mockResolvedValue('session-1');
  });

  it('explains when camera access is denied', async () => {
    // ...
    await user.click(screen.getByRole('button', { name: /open camera/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Camera or microphone access was denied.');
  });
});
```

## Hook test

```ts
const { result } = renderHook(() => useRecorder());
await act(() => result.current.start(createFakeStream()));
expect(result.current.state).toEqual({ status: 'recording' });
```

## Rules

- Arrange, act, assert, with one behaviour per `it`. The name says what the user observes ("shows the Go validation error as an alert"), not how it is implemented.
- Query priority: `getByRole` > `getByLabelText` > `getByText`. Use `findBy*` for anything that appears after an `await`.
- Always use `userEvent.setup()` rather than `fireEvent`.
- Mocks are reset automatically (`restoreMocks: true`), so set return values inside each test.
- Simulate Go errors with `mockRejectedValue('<go error string>')`, because that is what Wails does.
- Don't snapshot-test components; assert on visible behaviour.
- Cover the loading, success, error and empty states, plus races (a stale response arriving late) for async hooks.
