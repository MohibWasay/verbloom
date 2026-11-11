---
name: react-typescript-best-practices
description: Verbloom's React 19 + TypeScript standards — feature-folder structure, the api/lib/hooks/components split, calling Go through Wails bindings, strict typing, small components, state and effects, accessibility, shadcn/ui + Tailwind styling, browser media APIs, and Vitest + Testing Library tests. Use whenever writing, refactoring, reviewing or testing anything under frontend/ (components, hooks, styles, tsconfig, Vite or ESLint config), adding a new UI feature, or when tsc or ESLint reports a problem.
---

# React + TypeScript best practices for Verbloom

The compiler (`tsconfig.app.json`, every strict flag on) and ESLint (`strictTypeChecked`, size limits, import boundaries) enforce most of these rules. Do not loosen either config to make code pass.

## Structure

```
src/
  main.tsx                    mount only
  app/                        App.tsx, providers, app-level layout
  features/<feature>/
    api/<feature>Api.ts       the only place that imports @wailsjs/*
    lib/<thing>.ts            plain TS logic (no React): protocols, formatting, browser APIs
    hooks/use<Thing>.ts       React state around lib/ and api/
    components/<Name>.tsx     presentation; one exported component per file
    types.ts                  feature types (when shared by several files)
    index.ts                  public API: export only what other code may use
  shared/
    ui/                       shadcn/ui components (generated, then made lint-clean)
    lib/                      pure helpers (errors, cn)
  styles/global.css           Tailwind import + shadcn theme tokens
  test/setup.ts               Vitest setup
  test/fakes/                 fakes for browser APIs jsdom lacks (MediaRecorder, MediaStream)
```

- Features never deep-import each other: `import { X } from '@/features/notes'`, never `@/features/notes/hooks/...` (ESLint blocks it). Inside a feature, use relative imports.
- `shared/` never imports from `features/`.
- Move code to `shared/` only once a **second** feature needs it.
- See `references/feature-recipe.md` for a full new-feature walkthrough.

## Layers inside a feature

1. **api/**: one thin, typed function per Go binding. No React here. It is the seam that tests mock.
2. **lib/**: framework-free logic, such as a recording session, an upload queue or error mapping. Inject dependencies (the API object, factories like `createRecorder`) through an options object so tests need no module mocks.
3. **hooks/**: owns state and async logic and calls `lib/` and `api/`. Returns a small, typed object. Model state as a discriminated union (`idle | loading | success | error`), not as several booleans.
4. **components/**: render props and hook output. No direct Go calls, no business rules.

## Size limits (enforced)

File ≤ 200 lines, function ≤ 80 lines, complexity ≤ 10, depth ≤ 3, ≤ 3 params (pass an object instead). When a component grows, pull out child components and hooks; don't just add more JSX.

## TypeScript

- Use `type` for object shapes (enforced), not `interface`. Exported functions declare their return types (`JSX.Element`, `Promise<void>` and so on).
- Never use `any`. Use `unknown` and narrow it. No non-null `!` assertions; handle the null case explicitly.
- `noUncheckedIndexedAccess` is on: index access returns `T | undefined`, so handle it.
- `exactOptionalPropertyTypes` is on: `prop?: string` cannot be passed `undefined` explicitly. Model it as `prop?: string | undefined` only when needed.
- Use `import type` for type-only imports (enforced through `verbatimModuleSyntax`).
- Use exhaustive `switch` on discriminated unions; the lint rule fails on a missing case.
- Don't use enums, namespaces or parameter properties (ESLint blocks them). Use string-literal unions plus `as const` objects instead. (`erasableSyntaxOnly` stays off only because Wails generates namespaces in `wailsjs/go/models.ts`.)

## React

- Use function components and named exports only (no `export default`, except where a tool requires it).
- Props are a `type <Name>Props`, destructured in the signature.
- Derive values during render instead of syncing them through `useEffect`. An effect is only for talking to something outside React (subscriptions, Wails events, timers), and it always cleans up.
- Async handlers: `void doAsync()` inside event handlers, because promises must never float. Guard against stale responses (see `useCameraStream`'s request counter) or use an `AbortController`.
- Lists use stable domain IDs as `key`, never the array index.
- Reach for `useMemo` or `useCallback` only for referential stability that a dependent hook or child actually needs, or for measured hot paths.
- Global state is a last resort. Start with local state, then lift it up, then use context in `app/`.

## Calling Go

- Wrap every binding call in `callGo(() => Binding(...))` from `@/shared/lib/backend`. It turns a missing `window.go` (page opened outside Wails) into an actionable error. API tests stub it with `vi.stubGlobal('go', {})`.
- Wails bindings return Promises. A Go `error` arrives as a **rejected string**, so always normalise it with `toErrorMessage` from `@/shared/lib/errors`.
- Go structs arrive as classes from `@wailsjs/go/models`. Map them to plain feature types in `api/` if the shape differs from what the UI needs.
- Never edit `frontend/wailsjs/`. Regenerate it with `make bindings`.

## Accessibility and styling

- Use semantic elements (`main`, `section`, `form`, `button`). Every input has a `<label>`. Loading and error messages use `aria-live` or `role="alert"`. Decorative icons get `aria-hidden`.
- Build UI from **shadcn/ui** components in `@/shared/ui` and style with **Tailwind** utility classes using the theme tokens (`bg-muted`, `text-muted-foreground`, `text-destructive`), never raw hex colours. Merge classes with `cn()` from `@/shared/lib/utils`. No inline `style` except for truly dynamic values.
- Add components with `npx shadcn@latest add <name>` from `frontend/`. Then make the generated file pass lint without exemptions: add explicit return types, and move `cva` variant objects into `<name>-variants.ts` so the component file exports only components. Check the generated imports point to `@/shared/lib/utils` and not to an npm package.
- Icons come from `lucide-react`.

## Browser media APIs (camera, recording)

- Every `MediaStream` you open must have its tracks stopped on close, on unmount, and when a slower request is superseded (see `useCameraStream`).
- Map `getUserMedia` `DOMException` names to messages a user can act on (`lib/cameraErrors.ts`).
- Feature-detect (`'mediaDevices' in navigator`, `MediaRecorder.isTypeSupported`) and show a clear message instead of failing silently. `isTypeSupported` can lie (WebKitGTK says yes to MP4, then `start()` throws), so treat a successful `start()` as the only real proof and fall back through the candidates.
- Stream large binary data to Go in ordered chunks (`createChunkUploader`). Never send a whole recording through one binding call.

## Tests

Use Vitest + Testing Library + user-event. Details and templates are in `references/testing.md`.

- Every component, hook and lib function gets a colocated `*.test.ts(x)`. Coverage must stay ≥ 80% (enforced).
- Query by role, label or text the way a user would. Never use test IDs unless nothing else is possible.
- Mock at the `api/` seam with `vi.mock('../api/<feature>Api')`, never deeper. For browser APIs, use the fakes in `src/test/fakes/` with `vi.stubGlobal`, and reset them in `beforeEach` (`restoreMocks` only restores `vi.spyOn` mocks).

## Done means

`cd frontend && npm run check` passes (typecheck, lint with zero warnings, Prettier, tests), and the repo-wide `make check` is green.
