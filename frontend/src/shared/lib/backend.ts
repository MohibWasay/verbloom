export const BACKEND_UNAVAILABLE_MESSAGE =
  'The Go backend is not connected. Run `make dev` and open http://localhost:34115 (the Wails server), not the Vite server on port 5173.';

/** True when the page runs inside Wails, which injects `window.go`. */
export function hasGoBackend(): boolean {
  return 'go' in window;
}

/**
 * Calls a Wails binding, failing with an actionable message instead of
 * "Cannot read properties of undefined" when the page is not served by
 * Wails. Use it for every call in a feature's api/ module.
 */
export function callGo<T>(call: () => Promise<T>): Promise<T> {
  if (!hasGoBackend()) {
    return Promise.reject(new Error(BACKEND_UNAVAILABLE_MESSAGE));
  }
  return call();
}
