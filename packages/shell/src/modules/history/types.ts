// The address bar as a value the shell can read and watch: the History API behind one small interface, so the rest of the shell never
// touches `window`. `subscribe` and `path` are what React's `useSyncExternalStore` takes.

export interface History {
  /** The current pathname, as the browser has it (still percent-encoded). */
  readonly path: () => string;
  /** The current query string, with its `?` (or empty). Read-only to the app: it moves with `push`. */
  readonly search: () => string;
  /** Go to an address (a pathname, with a query if it has one): one new entry, and every subscriber told. The current address is not pushed again. */
  readonly push: (to: string) => void;
  /** Call `listener` when the address changes, by `push` or by the browser's back and forward. Returns the way to stop. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** The part of `window` the history uses. */
export interface Browser {
  readonly location: { readonly pathname: string; readonly search: string };
  readonly history: { readonly pushState: (state: unknown, unused: string, url: string) => void };
  readonly addEventListener: (type: "popstate", listener: () => void) => void;
  readonly removeEventListener: (type: "popstate", listener: () => void) => void;
}
