# Adding a frontend feature

`src/features/profile` (simple load-on-mount) and `src/features/recording` (lib/ + hooks/ + several components) are the reference implementations. This example assumes the Go side already exposes `notes.Service` with `List() ([]Note, error)` and bindings are regenerated.

## 1. api/notesApi.ts

```ts
import { List } from '@wailsjs/go/notes/Service';

import type { Note } from '../types';

export async function listNotes(): Promise<Note[]> {
  const notes = await List();
  return notes.map((n) => ({ id: n.id, title: n.title }));
}
```

## 2. types.ts

```ts
export type Note = {
  id: string;
  title: string;
};
```

## 3. hooks/useNotes.ts

```ts
export type NotesState =
  | { status: 'loading' }
  | { status: 'ready'; notes: Note[] }
  | { status: 'error'; error: string };

export function useNotes(): NotesState {
  const [state, setState] = useState<NotesState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    listNotes().then(
      (notes) => { if (!cancelled) setState({ status: 'ready', notes }); },
      (error: unknown) => { if (!cancelled) setState({ status: 'error', error: toErrorMessage(error) }); },
    );
    return () => { cancelled = true; };
  }, []);

  return state;
}
```

## 4. components/

- `NotesPanel.tsx` calls `useNotes()` and switches on `state.status`.
- `NoteList.tsx` gets `notes: Note[]` as a prop and is purely presentational.
- Style with Tailwind classes and shadcn components from `@/shared/ui` (e.g. `Card`, `Button`).

## 5. index.ts

```ts
export { NotesPanel } from './components/NotesPanel';
export type { Note } from './types';
```

## 6. Tests

- `api/notesApi.test.ts` mocks `@wailsjs/go/notes/Service` and checks the mapping.
- `hooks/useNotes.test.ts` mocks `../api/notesApi` and covers loading, ready, error, and an unmount before resolve.
- `components/NotesPanel.test.tsx` mocks `../api/notesApi` and asserts what the user sees for each state.

## 7. Mount it

Import it from `@/features/notes` in `src/app/App.tsx`, then run `npm run check`.
