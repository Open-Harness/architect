// A window with an address and a stack of entries, for the history's tests and the frame's: just enough of the browser to push, go back and forward.
import type { Browser } from "../types.ts";

export interface FakeWindow extends Browser {
  readonly back: () => void;
  readonly forward: () => void;
  readonly entries: () => ReadonlyArray<string>;
}

export const fakeWindow = (start: string): FakeWindow => {
  const stack = [start];
  let at = 0;
  const popstate = new Set<() => void>();
  const location = {
    get pathname() { return (stack[at] ?? "/").split("?")[0] ?? "/"; },
    get search() { const q = (stack[at] ?? "").split("?")[1]; return q === undefined ? "" : `?${q}`; },
  };
  const move = (to: number): void => {
    if (to < 0 || to >= stack.length) return;
    at = to;
    for (const listener of popstate) listener();
  };
  return {
    location,
    history: { pushState: (_state, _unused, url) => { stack.splice(at + 1, stack.length, url); at += 1; } },
    addEventListener: (_type, listener) => { popstate.add(listener); },
    removeEventListener: (_type, listener) => { popstate.delete(listener); },
    back: () => { move(at - 1); },
    forward: () => { move(at + 1); },
    entries: () => stack,
  };
};
