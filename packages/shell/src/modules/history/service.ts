import type { Browser, History as HistoryType } from "./types.ts";

/** The history of a browser window: the History API, and `popstate` for back and forward. */
const browser = (win: Browser): HistoryType => {
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  const path = (): string => win.location.pathname;
  const search = (): string => win.location.search;
  const push =(to: string): void => {
    if (to === `${win.location.pathname}${win.location.search}`) return;
    win.history.pushState(null, "", to);
    notify();
  };
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    win.addEventListener("popstate", listener);
    return () => {
      listeners.delete(listener);
      win.removeEventListener("popstate", listener);
    };
  };
  return { path, search, push, subscribe };
};

export const History = { browser } as const;
