// The store: a value and its listeners, nothing more. It never reads the network; the entry settles it.
import type { Loaded, Store } from "../types.ts";

export const makeStore = (): Store => {
  let current: Loaded = { state: "loading" };
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    settle: (next) => {
      current = next;
      for (const listener of listeners) listener();
    },
  };
};
